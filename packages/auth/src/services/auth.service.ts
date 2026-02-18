import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import ms from 'ms';
import QRcode from 'qrcode';
import speakeasy from 'speakeasy';
import {
	AuthTypes,
	AuthConstants,
	UserTypes,
	RedisCache,
	SharedErrors,
} from '@transcendence/shared';
import { AuthEnv } from '../index.js';
import { 
	REDIS_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes } from '@transcendence/shared';
import { redisClient } from '../app.js';

export class AuthService {
	
	// ========================================================================
	// PROPIEDADES
	// ========================================================================
	private setupCache: RedisCache<AuthTypes.SetupTokenData>;
	
	// ========================================================================
	// CONSTRUCTOR
	// ========================================================================
	constructor() {
		if (!redisClient)
			throw new Error('Cliente Redis no está inicializado en Auth Service');
		
		this.setupCache = new RedisCache<AuthTypes.SetupTokenData>(
			redisClient,	// La instancia singleton de Redis que se importa desde la app
			'2fa:setup:'	// Prefix para todas las keys ( '2fa:setup:{setupToken}' )
		);
	}
	
	// ========================================================================
	// HELPER PRIVATE FUNCTIONS
	// ========================================================================
	
	// FETCHERS
	
	/** Fetch user con email desde user service */
	private async fetchUserByEmail(email: string): Promise<UserTypes.UserInternal | null> {
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/users/by-email/${email}`,
			{ 
				headers:{ 'X-Service-Secret': AuthEnv.SERVICE_SECRET() },
				signal: AbortSignal.timeout(5000)
			}
		)
		
		if (!response.ok) {
			return null; // Retornar null en lugar de lanzar error (para evitar user enumeration en login)
		}
		
		return await response.json() as UserTypes.UserInternal;
	}
	
	/** Fetch user con id desde user service */
	private async fetchUserById(userId: string): Promise<UserTypes.UserInternal> {
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/users/by-id/${userId}`,
			{ 
				headers: {'X-Service-Secret': `${AuthEnv.SERVICE_SECRET()}`},
				signal: AbortSignal.timeout(5000)
			}
		);
		
		if (!response.ok) {
			throw new SharedErrors.NotFoundError('Usuario no encontrado', 'auth');
		}
		
		return await response.json() as UserTypes.UserInternal;
	}
	
	// LOGIN PROCESS - COMPLETAR LOGIN CON O SIN 2FA
	
	/** Completa el proceso de login generando tokens y seteando el usuario online */
	private async completeLogin(
		user: UserTypes.UserInternal,
		is2FAVerified: boolean = false
	): Promise<AuthTypes.LoginSuccessResponse> {
		
		// Guard: Redis disponible?
		if (!redisClient) {
			throw new SharedErrors.ServiceError('redis', 'Redis client not available');
		}
		
		// borrar refresh tokens de sesiones previas si UNIQUE_SESSION es true
		if (AuthEnv.UNIQUE_SESSION() === true) {
			await this.deleteRefreshTokensById(user.id);
			await this.updateLastLogoutAt(user.id);
		}
		
		// establecer usuario online
		await this.setUserIsOnline(user.id, true);
		
		// DEFINICIÓN DEL EVENTO (Cumpliendo UserLoginEvent)
		const loginEvent: TranscendenceEventsTypes.UserLoginEvent = {
			type: TRANSCENDENCE_EVENTS.USER_LOGIN,
			targetUserId: user.id,
			source: 'auth-service', // Este campo extra nos dirá quien disparó el event (para logs)
			timestamp: Date.now(),
			payload: {
				userId: user.id,
				username: user.username,
				avatar: user.avatar,
				email: user.email,
				lastLogoutAt: user.lastLogoutAt,
				isOnline: user.isOnline
			}
		};
		
		// PUBLICACIÓN EN REDIS
		// Usamos .catch para que un fallo en Redis NO impida el login del usuario (Resiliency)
		redisClient.publish(REDIS_CHANNEL, JSON.stringify(loginEvent))
		.catch(err => {
			console.error(`[Redis] Failed to publish ${TRANSCENDENCE_EVENTS.USER_LOGIN}:`, err);
		});
		
		// Crear user payload y par tokens
		return this.generateTokenPair(user, is2FAVerified);
	}
	
	// VERIFICA PASSWORD
	
	/** Verify password against hash */
	private async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
		return await bcrypt.compare(password, passwordHash);
	}
	
	// GENERACION DE PAR DE ACCESS Y REFRESH TOKENS
	private async generateTokenPair(
		user: UserTypes.UserInternal,
		is2FAVerified: boolean
	): Promise<AuthTypes.LoginSuccessResponse> {
		const userPayload: AuthTypes.UserPayload = {
			id: user.id,
			username: user.username,
			email: user.email,
			has2FAEnabled: user.has2FAEnabled,
			is2FAVerified: is2FAVerified
		};
		
		const accessToken = this.generateJWT(userPayload, is2FAVerified, AuthEnv.TOKEN_EXPIRY());
		const refreshToken = await this.createAndStoreRefreshToken(user.id, is2FAVerified);
		
		return { token: accessToken, refreshToken: refreshToken, user: userPayload };
	}
	
	// ACCESS TOKEN MANGEMENT
	
	// GENERAR ACCESS TOKEN
	
	/** Generate JWT access token */
	private generateJWT(
		userPayload: AuthTypes.UserPayload,
		is2FAVerified: boolean,
		expiry: number
	): string {	
		return jwt.sign(
			{
				...userPayload,
				is2FAVerified
			},
			AuthEnv.JWT_SECRET(),
			{ expiresIn: expiry } as SignOptions
		);
	}
	
	// REFRESH TOKENS
	
	// GENERAR REFRESH TOKEN Y ALMACENAR EN USER DB 
	
	/** Create and store refresh token */
	private async createAndStoreRefreshToken(
		userId: string,
		is2FAVerified: boolean
	): Promise<string> {
		
		// generar refresh token random
		const refreshToken = crypto.randomBytes(32).toString('hex');
		
		// hashear con sha-256 (64 caracteres)
		const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

		// Calcula expiración (REFRESH_TOKEN_EXPIRY en segundos, convierte a ms)
		const expiresAt = new Date(Date.now() + ms(AuthEnv.REFRESH_TOKEN_EXPIRY() * 1000));
		
		// almacenar record refresh token
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/tokens`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': `${AuthEnv.SERVICE_SECRET()}`
				},
				body: JSON.stringify({
					userId,
					tokenHash,
					expiresAt,
					is2FAVerified
				}),
				signal: AbortSignal.timeout(5000)
			}
		);
		
		if (!response.ok) {
			throw new SharedErrors.ServiceError('user', 'Fallo al almacenar refresh token', {
				endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/tokens`,
				method: 'POST',
				status: response.status,
				statusText: response.statusText,
				userId
			});
		}
		
		// devuelve refresh token sin hashear
		return refreshToken;
	}
	
	// VERIFICAR REFRESH TOKENS
	
	/** Verifica refresh token para refrescar tokens */
	private async verifyRefreshToken(refreshTokenHash: string): Promise<AuthTypes.RefreshTokenRecord> {
		
		const verified = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/tokens/verify`,
			{
				method: 'POST',
				headers: { 
					'X-Service-Secret': AuthEnv.SERVICE_SECRET(),
					'Content-Type': 'application/json' 
				},
				body: JSON.stringify({ tokenHash: refreshTokenHash }),
				signal: AbortSignal.timeout(5000)
			}
		);
		
		if (verified.status === 404)
			throw new SharedErrors.UnauthorizedError('Token inválido o expirado', {
			endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/tokens/verify`,
			method: 'POST',
			status: 404
		});
		
		if (!verified.ok)
			throw new SharedErrors.ServiceError('user', 'Fallo conectando con User Service al verificar refresh token', {
			endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/tokens/verify`,
			method: 'POST',
			status: verified.status,
			statusText: verified.statusText
		});
		
		return await verified.json() as AuthTypes.RefreshTokenRecord;
	}
	
	/** Elimina todos los refresh token del usuario */
	private async deleteRefreshTokensById(userId: string): Promise<void> {
		const response = await fetch(`${AuthEnv.USER_SERVICE_URL()}/internal/tokens/user/${userId}`, {
			method: 'DELETE',
			headers: {
				'X-Service-Secret': AuthEnv.SERVICE_SECRET()
			},
			signal: AbortSignal.timeout(5000)
		});
		
		// Casos exitosos, se silencia Not Found para evitar enumeracion de sesiones
		if (response.ok) return;
		if (response.status === 404) return;
		
		// Casos de error mapeados a SharedErrors
		if (response.status === 401 || response.status === 403) {
			throw new SharedErrors.UnauthorizedError(
				`Autenticación de servicio falló al borrar tokens`,
				{
					endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/tokens/user/${userId}`,
					method: 'DELETE',
					status: response.status,
					userId
				}
			);
		}
		
		const errorBody = await response.text().catch(() => 'Response sin body');
		throw new SharedErrors.ServiceError('user', `Error en User Service borrando tokens`, {
			endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/tokens/user/${userId}`,
			method: 'DELETE',
			status: response.status,
			statusText: response.statusText,
			errorBody,
			userId
		});
	}
	
	// LOGOUT 
	
	/** Actualiza el lastLogoutAt del usuario con timestamp generado por el servicio Auth que también generar el timestamp del JWT */
	private async updateLastLogoutAt(userId: string): Promise<void> {
		const body = { lastLogoutAt: Math.floor(Date.now() / 1000)  };
		
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/logout`,
			{
				method: 'PUT',
				headers: {
					'X-Service-Secret': AuthEnv.SERVICE_SECRET(),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(5000)
			}
		);
		
		if (response.ok) return;
		if (response.status === 404) {
			console.debug(`Logout 404 para userId: ${userId}`);
			return;
		} 
		
		if (response.status === 401 || response.status === 403) {
			throw new SharedErrors.UnauthorizedError(
				'Autenticación de servicio falló al realizar logout',
				{
					endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/logout`,
					method: 'PUT',
					status: response.status,
					userId
				}
			);
		}
		
		const errorBody = await response.text().catch(() => 'Response sin body');
		throw new SharedErrors.ServiceError('user', `Error en User Service haciendo logout`, {
			endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/logout`,
			method: 'PUT',
			status: response.status,
			statusText: response.statusText,
			errorBody,
			userId
		})
	}
	
	// 2FA SETUP
	
	// GENERA BACKUP CODE
	
	/** Genera backup code en formato XXXX-XXXX */
	private generate2FABackupCode(): string {
		const bytes = crypto.randomBytes(4); // 4 bytes = 8 hex chars
		const hex = bytes.toString('hex').toUpperCase();
		return `${hex.slice(0,4)}-${hex.slice(4)}`
	}
	
	// PROVSIONAL TOKEN VERIFICATION
	
	/** Verificay parsea provisional token */
	private verifyProvisionalToken(token: string) {
		const payload = jwt.verify(token, AuthEnv.JWT_SECRET());
		
		if (typeof payload === 'string' || payload.purpose !== AuthConstants.TOKEN_PURPOSE_2FA_VERIFICATION)
			throw new SharedErrors.UnauthorizedError('Token provisional inválido', {
			purpose: typeof payload !== 'string' ? payload.purpose : undefined,
			expectedPurpose: AuthConstants.TOKEN_PURPOSE_2FA_VERIFICATION
		});
		
		return payload as AuthTypes.ProvisionalTokenPayload;
	}
	
	// 2FA USO (Y SETUP)
	
	// VERIFICA TOTP CODE
	
	/** Verfica totp code recibido en login de 2FA y setup de 2FA */
	private verify2FATotpCode(secret: string, token: string): boolean {
		return speakeasy.totp.verify({
			secret,
			encoding: 'base32',
			token,
			window: 1 // +/- 1 intervalo de tiempo
		});
	}
	
	// USER STATUS
	
	/** Actualiza el 2FA status del usuario 
	* @param userId - ID del usuario
	* @param has2FAEnabled - true para activar, false para desactivar
	* @param totpSecret - REQUERIDO si enabled=true, omitir si enabled=false
	* @param backupCodeHash - REQUERIDO si enabled=true, omitir si enabled=false
	*/
	private async update2FAStatus(
		userId: string,
		has2FAEnabled: boolean,
		totpSecret?: string,
		backupCodeHash?: string
	): Promise<void> {
		const body: any = { has2FAEnabled: has2FAEnabled };
		
		// Incluir secrets si existen (enabled=true)
		if (totpSecret !== undefined)
			body.totpSecret = totpSecret;
		if (backupCodeHash !== undefined)
			body.backupCodeHash = backupCodeHash;
		
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/2fa-status`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET()
				},
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(5000)
			}
		);
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
			console.error('Error updating 2FA status:', {
				status: response.status,
				errorData,
				requestBody: { has2FAEnabled: has2FAEnabled, totpSecret, backupCodeHash }
			});
			throw new SharedErrors.ServiceError('user', `Fallo actualizando 2FA`, {
				endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/2fa-status`,
				method: 'PATCH',
				status: response.status,
				errorData,
				userId,
				has2FAEnabled
			});
		}
	}
	
	/** Set user online/offline status */
	private async setUserIsOnline(userId: string, isOnline: boolean): Promise<void> {
		const response = await fetch(`${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/online-status`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				'X-Service-Secret': AuthEnv.SERVICE_SECRET()
			},
			body: JSON.stringify({ isOnline }),
			signal: AbortSignal.timeout(5000)
		});
		
		if (!response.ok) {
			throw new SharedErrors.ServiceError('user', `Fallo al actualizar estado online del usuario`, {
				endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/online-status`,
				method: 'PATCH',
				status: response.status,
				statusText: response.statusText,
				userId,
				isOnline
			});
		}
	}
	
	/** Validación de argumento avatar en register y updateUser */
	private validateAvatar(avatar?: string): boolean {
		if (!avatar || avatar.trim() === "") return false;
		
		// Validar formato y extraer base64
		const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
		const match = avatar.match(base64Regex);
		if (!match) return false;
		
		const [, mimeType, base64Data] = match;
		
		// Validar que base64 sea válido
		try {
			Buffer.from(base64Data, 'base64');
		} catch (e) {
			return false;  // Base64 inválido
		}
		
		// Validar tamaño (exacto, no aproximado)
		const sizeInBytes = Buffer.from(base64Data, 'base64').length;
		const maxSizeBytes = 10 * 1024 * 1024; // 10MB
		
		return sizeInBytes <= maxSizeBytes;
	}
	
	//** Upload de imagen llamando a Image Service */
	private async uploadAvatarToCloudinary(
		base64Image: string,
		oldAvatarUrl?: string
	): Promise<string> {
		try {
			const payload = {
				base64: base64Image,
				...(oldAvatarUrl && { old_avatar: oldAvatarUrl })
			};
			
			const response = await fetch(
				`${AuthEnv.IMAGE_SERVICE_URL()}/internal/upload`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Service-Secret': AuthEnv.SERVICE_SECRET()
					},
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(5000)
				}
			);
			
			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Unknown error' })) as any;
				const errorMessage = error?.message || error?.error || 'No hay mensaje de error';
				throw new SharedErrors.ServiceError('image', `Fallo subiendo avatar a Cloudinary`, {
					endpoint: `${AuthEnv.IMAGE_SERVICE_URL()}/internal/upload`,
					method: 'POST',
					status: response.status,
					statusText: response.statusText,
					errorMessage
				});
			}
			
			const data = await response.json() as { url: string };
			
			// Validar que URL sea válida
			if (!data.url || typeof data.url !== 'string') {
				throw new SharedErrors.ValidationError(
					'Image Service retornó URL inválida',
					'url',
					{
						received: typeof data.url,
						expected: 'string',
						operation: 'uploadAvatarToCloudinary'
					}
				);
			}
			
			// Validar que sea URL válida
			try {
				new URL(data.url);
			} catch (e) {
				throw new SharedErrors.ValidationError(
					'Image Service retornó URL inválida',
					'url',
					{
						receivedUrl: data.url,
						domain: data.url?.split('/')[2],
						operation: 'uploadAvatarToCloudinary',
						error: e instanceof Error ? e.message : 'Invalid URL'
					}
				);
			}
			
			return data.url;
		} catch (err) {
			if (err instanceof SharedErrors.AppError) throw err;  // Re-throw validation errors
			console.error('Fallo subiendo avatar: ', err);
			// Fallback a default avatar (similar a user.service)
			return AuthEnv.CLOUDINARY_DEFAULT_AVATAR();
		}
	}
	
	/** Upload de avatar con fallback a avatar anterior o default */
	private async uploadAvatarWithFallback(
		base64Image: string,
		oldAvatarUrl?: string
	): Promise<string> {
		try {
			return await this.uploadAvatarToCloudinary(base64Image, oldAvatarUrl);
		} catch (err) {
			console.error('Fallo uploadAvatarToCloudinary, usando fallback: ', err);
			// Mantener avatar anterior si existe, sino default
			return oldAvatarUrl || AuthEnv.CLOUDINARY_DEFAULT_AVATAR();
		}
	}
	
	// ========================================================================
	// CREATE USER
	// ========================================================================
	
	async register(
		username: string,
		email: string,
		password: string,
		avatar?: string
	): Promise<AuthTypes.LoginResponse> {
		
		let avatarUrl = AuthEnv.CLOUDINARY_DEFAULT_AVATAR();
		
		// Si existe avatar ya ha sido validado por ajv, subirlo a Cloudinary
		if (avatar) {
			avatarUrl = await this.uploadAvatarWithFallback(avatar);
		}

		// Crear usuario en User Service
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/users`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET()
				},
				body: JSON.stringify({
					username,
					email,
					avatar: avatarUrl,
					password
				}),
				signal: AbortSignal.timeout(5000)
			}
		);
		
		// Manejo de errores
		if (!response.ok) {
			const errorData = await response.json();
			
			if (response.status === 409) {
				const error = errorData as any;
				throw new SharedErrors.ConflictError(
					error.message || 'Email/Username ya existe',
					error.field || 'email/username',
					{
						endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users`,
						method: 'POST',
						status: 409,
						attemptedUsername: username,
						attemptedEmail: email
					}
				);
			}
			
			if (response.status === 400) {
				const error = errorData as any;
				throw new SharedErrors.ValidationError(
					error.message || 'Datos de usaurio inválidos',
					error.field || 'unknown',
					{
						endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users`,
						method: 'POST',
						status: 400,
						attemptedUsername: username,
						attemptedEmail: email
					}
				);
			}
			
			throw new SharedErrors.ServiceError('user', `Fallo creando usuario`, {
				endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users`,
				method: 'POST',
				status: response.status,
				errorData,
				attemptedUsername: username,
				attemptedEmail: email
			})
		}
		
		// Login automático
		return await this.login(email, password);
	}
	
	// ========================================================================
	// PUBLIC API - LOGIN / REFRES TOKENS / LOGOUT
	// ========================================================================
	
	/** Login */
	async login(email: string, password: string): Promise<AuthTypes.LoginResponse> {
		const user = await this.fetchUserByEmail(email);
		if (!user) {
			throw new SharedErrors.UnauthorizedError('Credenciales inválidas', {
				operation: 'login',
				reason: 'userNotFound',
				attemptedEmail: email
			});
		}
		
		const valid = await this.verifyPassword(password, user.passwordHash);
		if (!valid) {
			throw new SharedErrors.UnauthorizedError('Credenciales inválidas', {
				operation: 'login',
				reason: 'invalidPassword',
				userId: user.id
			});
		}
		
		// Intercepción si tiene 2fa enabled
		if (user.has2FAEnabled === true) {
			
			const provisionalToken = jwt.sign(
				{
					userId: user.id,
					email: user.email,
					purpose: AuthConstants.TOKEN_PURPOSE_2FA_VERIFICATION,
					iat: Math.floor(Date.now() / 1000)
				},
				AuthEnv.JWT_SECRET(),
				{ expiresIn: AuthConstants.PROVISIONAL_TOKEN_LIFETIME }
			);
			
			return {
				twoFactorRequired: true,
				userId: user.id,
				provisionalToken,
				expiresIn: AuthConstants.PROVISIONAL_TOKEN_LIFETIME
			};
		}
		
		// Flujo de login sin 2A
		return await this.completeLogin(user, false);
	}
	
	
	/** Renovar access token usando refresh token */
	async refreshAccessToken(refreshToken: string): Promise<AuthTypes.LoginSuccessResponse> {
		// Hashear token
		const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
		
		// Verificar token con User Service via helper method
		const tokenRecord = await this.verifyRefreshToken(tokenHash);
		
		// Obtener datos actuales del usuario
		const user = await this.fetchUserById(tokenRecord.userId);
		
		// Validar si cambio la configuracion de 2FA desded que se generó el refresh token
		if (user.has2FAEnabled !== tokenRecord.is2FAVerified) {
			await this.deleteRefreshTokensById(user.id);
			throw new SharedErrors.UnauthorizedError(
				'Configuración de seguridad modificada. Inicia sesión nuevamente',
				{
					userId: user.id,
					operation: 'refreshAccessToken',
					userHas2FA: user.has2FAEnabled,
					tokenHas2FA: tokenRecord.is2FAVerified
				}
			);
		}
		
		await this.deleteRefreshTokensById(user.id);
		if (AuthEnv.UNIQUE_SESSION() === false && AuthEnv.NODE_ENV() === 'development') {
			console.warn(
				'⚠️  ROTACIÓN DE REFRESH TOKENS NO IMPLEMENTADA PARA MULTI-SESIÓN.\n' +
				'Con UNIQUE_SESSION=false, los refreshTokens de todas las sesiones se invalidan el logout.\n' +
				'Esto protege de vulnerabilidad de reuso de refreshTokens ya usados a costa del UX/UI (sesiones cerradas).\n' +
				'Soluciones:\n' +
				'  1. Usar UNIQUE_SESSION=true (recomendado)\n' +
				'  2. Implementar rotación granular por tokenId\n'
			);
		}
		
		// Generar token pai y user payload
		return await this.generateTokenPair(user, tokenRecord.is2FAVerified);
	}
	
	/** Logout */
	async logout(userId: string): Promise<void> {
		
		await this.deleteRefreshTokensById(userId);
		await this.updateLastLogoutAt(userId);

		try {
			// Recuperar usuario actualizado
			const user = await this.fetchUserById(userId);
			
			if (!user) {
				throw new SharedErrors.UnauthorizedError('Credenciales inválidas', {
					operation: 'logout',
					reason: 'userNotFound',
					attemptedId: userId
				});
			}

			// Setear user ofline
			await this.setUserIsOnline(userId, false);
						
			// Guard de Redis disponible
			if (!redisClient) {
				console.warn('[Auth] Redis no disponible - logout sin notificación');
				return;
			}

			// Preparar objeto para notificaciones
			const logoutEvent: TranscendenceEventsTypes.UserLogoutEvent = {
				type: TRANSCENDENCE_EVENTS.USER_LOGOUT,
				targetUserId: userId,
				source: 'auth-service',
				timestamp: Date.now(),
				payload: {
					userId: user.id,
					username: user.username,
					email: user.email,
					avatar: user.avatar,
					lastLogoutAt: user.lastLogoutAt,
					isOnline: false
				}
			}
			
			// Guard de Redis disponible
			if (!redisClient) {
				throw new SharedErrors.ServiceError('redis', 'Redis client not available');
			}

			// PUBLICACIÓN EN REDIS
			// Si no hay redis se completa el logout sin notificaciones y sin ropmer
			redisClient.publish(REDIS_CHANNEL, JSON.stringify(logoutEvent))
			.catch(err => {
				console.error(`[Redis] Failed to publish ${TRANSCENDENCE_EVENTS.USER_LOGOUT}:`, err);
			});

		} catch (err) {
			console.error(`Fallo al actualizar el estado online del usuario: ${userId}`, err);
		}
	}
	
	// ========================================================================
	// PUBLIC API - LOGIN 2FA VERIFY
	// ========================================================================
	
	/** Completa el proceso de login con 2FA utilizando el provisionalToken */
	async verify2FAWithToken(provisionalToken: string, totpCode: string): Promise<AuthTypes.LoginResponse> {
		// Verificar token provisional con user payload
		const payload = jwt.verify(provisionalToken, AuthEnv.JWT_SECRET());
		
		if (typeof payload === 'string' || payload.purpose !== AuthConstants.TOKEN_PURPOSE_2FA_VERIFICATION) {
			throw new SharedErrors.UnauthorizedError('Token inválido', {
				purpose: typeof payload !== 'string' ? payload.purpose : undefined,
				expectedPurpose: AuthConstants.TOKEN_PURPOSE_2FA_VERIFICATION
			});
		}
		
		const provisionalPayload = payload as AuthTypes.ProvisionalTokenPayload;
		const userId = provisionalPayload.userId;
		
		// OBtener el usuario internal con totpSecret
		const user = await this.fetchUserById(userId);
		
		// Verificar que 2FA esté habilitado
		if (!user.has2FAEnabled || !user.totpSecret) {
			throw new SharedErrors.UnauthorizedError('2FA no está habilitado para este usuario', {
				userId,
				has2FAEnabled: user.has2FAEnabled,
				hasTotpSecret: !!user.totpSecret
			});
		}
		
		// Veerificar código totp
		const verified = this.verify2FATotpCode(user.totpSecret, totpCode);
		
		if (!verified) {
			throw new SharedErrors.UnauthorizedError('Codigo 2FA inválido', {
				userId,
				operation: 'verify2FAWithToken'
			});
		}
		
		// actualizar tokens de refresh, estado online y generar access token
		return await this.completeLogin(user, true);
	}
	
	//=========================================================================
	// PUBLIC API - CHANGE PASSWORD
	//=========================================================================
	
	async changePassword(userId: string, oldPassword: string, newPassword: string):Promise<void> {
		const user = await this.fetchUserById(userId);
		
		const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
		
		if (!isPasswordValid) {
			throw new SharedErrors.UnauthorizedError(`Password actual incorrecta`, {
				userId,
				operation: 'changePassword'
			});
		}
		
		const passwordHash = await bcrypt.hash(newPassword, 10);
		
		const updateResponse = await fetch(
			`${AuthEnv.USER_SERVICE_URL()}/internal/users/${user.id}/password`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': `${AuthEnv.SERVICE_SECRET()}`
				},
				body: JSON.stringify({passwordHash}),
				signal: AbortSignal.timeout(5000)
			}
		);
		
		if (!updateResponse.ok) {
			throw new SharedErrors.ServiceError('user', `Fallo al actualizar password`, {
				endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users/${user.id}/password`,
				method: 'PUT',
				status: updateResponse.status,
				statusText: updateResponse.statusText,
				userId: user.id
			});
		}
	}
	
	// ========================================================================
	// PUBLIC API - 2FA MANAGEMENT
	// ========================================================================
	
	async enable2FA(userId: string): Promise<AuthTypes.Enable2FAResponse> {
		
		const user = await this.fetchUserById(userId);
		
		if (user.has2FAEnabled) {
			throw new SharedErrors.ConflictError('2FA ya está activado', 'has2FAEnabled', {
				userId,
				operation: 'enable2FA'
			});
		}
		
		// PASO 1 generar totp secret con speakeasy
		const secret = speakeasy.generateSecret({
			length: 32,									// largo 32
			name: `Transcendence: ${user.email}`,		// nombre en google authenticator (simplificado)
			issuer: 'transcend'							// emisor (aparece en la app, más corto)
		});
		// output
		// secret.base32 -> Secret en formato Base32 (para almacenar y verificar)
		// secret.otpauth_url -> URL para generar QR
		
		// PASO 2 genearar QRCode con configuración optimizada
		const qr = await QRcode.toDataURL(secret.otpauth_url as string, {
			width: 256,					// Tamaño en píxeles (más grande = más fácil de escanear)
			margin: 1,					// Margen blanco mínimo
			errorCorrectionLevel: 'L'	// Nivel bajo de corrección de errores (menos denso)
		})
		// qr es un Data URL base64: "data:image/png;base64,...(hash)"
		
		// PASO 3 generar backupCode
		const backupCode = this.generate2FABackupCode();
		// hashearlo para db
		const backupCodeHash = await bcrypt.hash(backupCode, 10);
		
		// PASO 4 generar setupToken
		const setupToken = crypto.randomBytes(32).toString('hex');
		
		// almacenar en setupCache(prefix: '2fa:setup:'), TTL Time To Live (AuthEnv)
		const setupData: AuthTypes.SetupTokenData = {
			userId: user.id,
			totpSecret: secret.base32?.replace(/\s/g, '').toUpperCase() ?? '',	// Base32 en mayúsculas sin espacios
			backupCodeHash,														// Para verificar en solicitud de recuperación
			attempts: 0
		};
		
		await this.setupCache.set(setupToken, setupData, AuthConstants.SETUP_TOKEN_TTL);
		
		return {
			setupToken,									// cliente lo devolverá en verify-2fa-setup
			backupCode,									// se mostrará en front para que usuario lo almacene
			qr											// se mostraré en front para activar authenticator
		};
	}
	
	/** Completa el proceso de activación de 2FA */
	async verify2FASetup(setupToken: string, totpCode: string): Promise<AuthTypes.LoginSuccessResponse> {
		// Recuperar setupData de setupCache (userId, totpSecret, backupCodeHash, attempts)
		const setupData = await this.setupCache.get(setupToken) as AuthTypes.SetupTokenData
		
		// Si falta en cache inválido o expirado
		if (!setupData)
			throw new SharedErrors.UnauthorizedError('SetupToken es inválido o expirado', {
			operation: 'verify2FASetup',
			tokenExpired: true
		});
		
		// Verificar límite de intentos
		const MAX_ATTEMPTS = AuthConstants.SETUP_MAX_ATTEMPTS;
		const attempts = (setupData.attempts || 0) + 1;
		
		// Si son demasiados, borrar el setupToken del cache, terminar
		if (attempts > MAX_ATTEMPTS) {
			await this.setupCache.delete(setupToken);
			throw new SharedErrors.UnauthorizedError(
				`Demasiados intentos fallidos. Solicita un nuevo código QR.`,
				{
					operation: 'verify2FASetup',
					attempts,
					maxAttempts: MAX_ATTEMPTS
				}
			);
		}
		
		// Verificar código totp XXXX-XXXX
		const verified = this.verify2FATotpCode(setupData.totpSecret, totpCode);
		
		// Si la verificacion totp falla, se incrementa el número de intentos en el cache, termina
		if (!verified) {
			// Actualiza el contador de intentos
			setupData.attempts = attempts;
			await this.setupCache.set(setupToken, setupData, AuthConstants.SETUP_TOKEN_TTL);
			
			const remaining = MAX_ATTEMPTS - attempts;
			throw new SharedErrors.UnauthorizedError(`Código 2FA inválido. ${remaining} intentos restantes de ${MAX_ATTEMPTS}`, {
				operation: 'verify2FASetup',
				attempts,
				maxAttempts: MAX_ATTEMPTS,
				remaining
			});
		}
		
		// Activar 2FA en user service
		await this.update2FAStatus(
			setupData.userId,
			true,
			setupData.totpSecret,
			setupData.backupCodeHash
		);
		
		// Limpiar setupCache
		await this.setupCache.delete(setupToken);
		
		// Borrar antiguo refresh token
		await this.deleteRefreshTokensById(setupData.userId);
		
		// Conseguir usuario para pasarlo como parametro
		// Generar nuevo par de tokens
		const user = await this.fetchUserById(setupData.userId); // DUDA se está pasando demasiada info con este user creo... que se necesita realmente... se puede obtenerdel jwtPayload? es esta una buena via? ya esta aregando una apicall más
		return await this.generateTokenPair(user, true);
	}
	
	/** Desactivar 2FA para usuarios  */
	async disable2FA(userId: string, password: string): Promise<AuthTypes.LoginSuccessResponse> {
		
		// Recuperar user
		const user = await this.fetchUserById(userId);
		
		// Verificar password vs passwordHash
		const valid = await this.verifyPassword(password, user.passwordHash);
		
		if (!valid) {
			throw new SharedErrors.UnauthorizedError('Credenciales inválidas', {
				userId,
				operation: 'disable2FA'
			});
		}
		
		await this.update2FAStatus(
			userId,
			false
		);
		
		// Borrar antiguo refresh token
		await this.deleteRefreshTokensById(userId);
		
		// Generar nuevo par de tokens
		return await this.generateTokenPair(user, false);
	}
	
	async verifyBackupCode(provisionalToken: string, backupCode: string): Promise<AuthTypes.LoginResponse> {
		
		const provisionalPayload = this.verifyProvisionalToken(provisionalToken);
		const userId = provisionalPayload.userId;
		const user = await this.fetchUserById(userId);
		
		if (!user.has2FAEnabled || !user.backupCodeHash)
			throw new SharedErrors.UnauthorizedError('2FA no está habilitado', {
			userId,
			has2FAEnabled: user.has2FAEnabled,
			hasBackupCode: !!user.backupCodeHash,
			operation: 'verifyBackupCode'
		});
		
		const isValid = await bcrypt.compare(backupCode, user.backupCodeHash);
		
		if (!isValid)
			throw new SharedErrors.UnauthorizedError('Código de recuperación inválido', {
			userId,
			operation: 'verifyBackupCode'
		});
		
		// Desactivar 2FA
		await this.update2FAStatus(userId, false);
		
		// Completar login
		return await this.completeLogin(user, false);
	}
}
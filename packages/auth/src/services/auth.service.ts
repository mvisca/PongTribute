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
	Utils,
	RedisCache,
	SharedErrors,
	isConflictError
} from '@transcendence/shared';
import { AuthEnv } from '../index.js';
import { redisClient } from '../app.js';
import { tokenId } from 'node_modules/@transcendence/shared/src/utils/uuidGenerator.js';

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
			redisClient,
			'2fa:setup:' // Prefix para todas las keys ( '2fa:setup:{setupToken}' )
		);
	}
	
	// ========================================================================
	// HELPER PRIVATE FUNCTIONS
	// ========================================================================
	
	// FETCHERS
	
	/** Fetch user con email desde user service */
	private async fetchUserByEmail(email: string): Promise<UserTypes.UserInternal | null> {
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/by-email/${email}`,
			{ headers:{ 'X-Service-Secret': AuthEnv.SERVICE_SECRET } }
		)
		
		if (!response.ok) {
			return null; // Retornar null en lugar de lanzar error (para evitar user enumeration en login)
		}
		
		return await response.json() as UserTypes.UserInternal;
	}
	
	/** Fetch user con id desde user service */
	private async fetchUserById(userId: string): Promise<UserTypes.UserInternal> {
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/by-id/${userId}`,
			{ headers: {'X-Service-Secret': `${AuthEnv.SERVICE_SECRET}`} }
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
		has2FAEnabled: boolean = user.has2FAEnabled
	): Promise<AuthTypes.LoginSuccessResponse> {
		// borrar refresh tokens de sesiones previas si UNIQUE_SESSION es true
		if (AuthEnv.UNIQUE_SESSION === true) {
			await this.deleteRefreshTokensById(user.id);
		}
		
		// establecer usuario online
		await this.setUserIsOnline(user.id, true);
		
		// Crear user payload y par tokens
		return this.generateTokenPair(user, true); // por que true el is2FAVerified? debería provenir del llamador del método, puede ser con o sin...
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
			has2FAEnabled: user.has2FAEnabled
		};

		const accessToken = this.generateJWT(userPayload, is2FAVerified, AuthEnv.TOKEN_EXPIRY);
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
			AuthEnv.JWT_SECRET,
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
		
		//TODO verificar que Token Expiry tiene las validaciones necesarias, ponerle un rango en build sharedEnv
		// calcula expiración usando REFRESH_TOKEN_EXPIRY (formato: "7d", "24h", etc.)
		const expiresAt = new Date(Date.now() + ms(AuthEnv.REFRESH_TOKEN_EXPIRY as any));
		
		// almacenar record refresh token
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/tokens`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': `${AuthEnv.SERVICE_SECRET}`
				},
				body: JSON.stringify({
					userId,
					tokenHash,
					expiresAt,
					is2FAVerified
				})
			}
		);
		
		if (!response.ok) {
			throw new Error(`Fallo al almacenar refresh token: ${response.status}`);
		}
		
		// devuelve refresh token sin hashear
		return refreshToken;
	}

		// VERIFICAR REFRESH TOKENS

	/** Verifica refresh token para refrescar tokens */
	private async verifyRefreshToken(refreshTokenHash: string): Promise<AuthTypes.RefreshTokenRecord> {
		
		const verified = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/tokens/verify`,
			{
				method: 'POST',
				headers: { 
					'X-Service-Secret': AuthEnv.SERVICE_SECRET,
					'Content-Type': 'application/json' 
				},
				body: JSON.stringify({ tokenHash: refreshTokenHash })
			}
		);

		if (verified.status === 404)
			throw new SharedErrors.UnauthorizedError('Token inválido o expirado');

		if (!verified.ok)
			throw new Error('Fallo conectando con User Service');
		// DUDA en algun caso hago estas dos comprabaciones anidadas, cual es mejor, esta lo parece

		return await verified.json() as AuthTypes.RefreshTokenRecord;
	}

		// ELIMINAR TODOS LOS REFRESH TOKENS DEL USUARIO CADUCADOS O POR ROTACIÓN
	
	/** Elimina todos los refresh token del usuario */
	private async deleteRefreshTokensById(userId: string): Promise<void> {
		const response = await fetch(`${AuthEnv.USER_SERVICE_URL}/internal/tokens/user/${userId}`, {
			method: 'DELETE',
			headers: {
				'X-Service-Secret': AuthEnv.SERVICE_SECRET
			},
			signal: AbortSignal.timeout(5000) // DUDA explicarlo, hace falta en otros endpoints? por qué se usa aqui?
		});
		
		// Casos exitosos, se silencia Not Found para evitar enumeracion de sesiones
		if (response.ok) return;
		if (response.status === 404) return;
		
		// Casos de error mapeados a SharedErrors
		if (response.status === 401 || response.status === 403) {
			throw new SharedErrors.UnauthorizedError(
				`Autenticación de servicio falló al borrar tokens`
			);
		}
		
		const errorBody = await response.text().catch(() => 'Response sin body');
		throw new Error(
			`Error en User Service borrando tokens (${response.status} ${response.statusText}). Body: ${errorBody}`
		);
	}

		// ELIMINAR UN REFRESH TOKEN EN PARTICULAR
		/* Mas granular para manejo de múltiples sesiones simultaneas. */

	// LOGOUT 

	/** Actualiza el lastLogoutAt del usuario con timestamp generado por el servicio Auth que también generar el timestamp del JWT */
	private async updateLastLogoutAt(userId: string) { // DUDA Tipar retorno
		const body = { lastLogoutAt: new Date().toISOString() };
		
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/${userId}/logout`,
			{
				method: 'PUT',
				headers: {
					'X-Service-Secret': AuthEnv.SERVICE_SECRET,
					'Content-Type': 'application/json'
				 },
				body: JSON.stringify(body)
			}
		);

		if (response.ok) return;
		if (response.status === 404) {
			console.debug(`Logout 404 para userId: ${userId}`);
			return;
		} 

		if (response.status === 401 || response.status === 403) {
			throw new SharedErrors.UnauthorizedError(
				'Autenticación de servicio falló al realizar logout'
			);
		}

		const errorBody = await response.text().catch(() => 'Response sin body'); // DUDA Explicar este caso, no se usa errorBody?
		throw new Error(
			`Error en User Service haciendo logout (${response.status} ${response.statusText}). Body: ${errorBody}`
		)
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
		const payload = jwt.verify(token, AuthEnv.JWT_SECRET);
		
		if (typeof payload === 'string' || payload.purpose !== AuthConstants.TOKEN_PURPOSE_2FA_VERIFICATION)
			throw new SharedErrors.UnauthorizedError('Token provisional inválido');
		
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
			`${AuthEnv.USER_SERVICE_URL}/internal/users/${userId}/2fa-status`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET
				},
				body: JSON.stringify(body)
			}
		);
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
			console.error('Error updating 2FA status:', {
				status: response.status,
				errorData,
				requestBody: { has2FAEnabled: has2FAEnabled, totpSecret, backupCodeHash }
			});
			throw new Error(`Fallo actualizando 2FA: ${response.status} - ${JSON.stringify(errorData)}`);
		}
	}
	
	/** Set user online/offline status */
	private async setUserIsOnline(userId: string, isOnline: boolean): Promise<void> {
		const response = await fetch(`${AuthEnv.USER_SERVICE_URL}/internal/users/${userId}/online-status`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				'X-Service-Secret': AuthEnv.SERVICE_SECRET
			},
			body: JSON.stringify({ isOnline })
		});
		
		if (!response.ok) {
			throw new Error(
				`Fallo al actualizar estado online del usuario: ${response.status} ${response.statusText}`
			);
		}
	}
	
	/** Validación de argumento avatar en register y updateUser */
	private validateAvatar(avatar?: string): boolean {
		if (!avatar || avatar.trim() === "") return false;
		
		// Validar base64
		const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
		if (!base64Regex.test(avatar)) return false;
		
		// Validar tamaño
		const base64Data = avatar.split(',')[1];
		if (!base64Data) return false;
		
		const sizeInBytes = (base64Data.length * 3) / 4; // Aproximación base64
		const maxSizeBytes = 10 * 1024 * 1024; // 10MB
		
		return sizeInBytes <= maxSizeBytes;
	}
	
	//** Upload de imagen llamando a Image Service */
	private async uploadAvatarToCloudinary(
		base64Image: string,
		oldAvatarUrl?: string
	): Promise<string> {
		try {
			const response = await fetch(
				`${AuthEnv.IMAGE_SERVICE_URL}/internal/upload`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Service-Secret': AuthEnv.SERVICE_SECRET
					},
					body: JSON.stringify({
						base64: base64Image,
						...( oldAvatarUrl && { old_avatar: oldAvatarUrl })
					})
				}
			)  // TODO Tipar retorno
			
			if (!response.ok) {
				const error = await response.json();
				const errorMessage = error ? error : "No hay mensaje de error";
				throw new Error(`Image service error: ${errorMessage || response.statusText}`);
			}
			
			const data = await response.json() as { url: string }; // TODO Mejorar tipado
			return data.url;
		} catch (err) {
			console.error('Fallo subiendo avatar: ', err);
			// Fallback a default avatar
			return AuthEnv.CLOUDINARY_DEFAULT_AVATAR;
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
		
		let avatarUrl = AuthEnv.CLOUDINARY_DEFAULT_AVATAR;
		
		// Si existe avatar, validarlo y subirlo a cloudinary
		if (avatar && this.validateAvatar(avatar)) {
			avatarUrl = await this.uploadAvatarToCloudinary(avatar);
		}
		
		const createUserRes = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET
				},
				body: JSON.stringify({
					username,
					email,
					avatar: avatarUrl,
					password
				})
			}
		);
		
		// Manejo de errores
		if (!createUserRes.ok) {
			const errorData = await createUserRes.json();
			
			if (createUserRes.status === 409 && SharedErrors.isConflictError(errorData)) {
				throw new SharedErrors.ConflictError(
					errorData.message,
					errorData.field
				);
			}
			
			throw new Error(`User creation failed: ${createUserRes.status}`)
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
			throw new SharedErrors.UnauthorizedError('Credenciales inválidas');
		}
		
		const valid = await this.verifyPassword(password, user.passwordHash);
		if (!valid) {
			throw new SharedErrors.UnauthorizedError('Credenciales inválidas');
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
				AuthEnv.JWT_SECRET,
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
				'Configuración de seguridad modificada. Inicia sesión nuevamente'
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
			await this.setUserIsOnline(userId, false);
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
		const payload = jwt.verify(provisionalToken, AuthEnv.JWT_SECRET);
		
		if (typeof payload === 'string' || payload.purpose !== '2fa_verification') { // TODO Aplicar la constante de AUTH al implementarla
			throw new SharedErrors.UnauthorizedError('Token inválido');
		}
		
		const provisionalPayload = payload as AuthTypes.ProvisionalTokenPayload;
		const userId = provisionalPayload.userId;
		
		// OBtener el usuario internal con totpSecret
		const user = await this.fetchUserById(userId);
		
		// Verificar que 2FA esté habilitado
		if (!user.has2FAEnabled || !user.totpSecret) {
			throw new SharedErrors.UnauthorizedError('2FA no está habilitado para este usuario');
		}
		
		// Veerificar código totp
		const verified = this.verify2FATotpCode(user.totpSecret, totpCode);
		
		if (!verified) {
			throw new SharedErrors.UnauthorizedError('Codigo 2FA inválido');
		}
		
		// actualizar tokens de refresh, estado online y generar access token
		return await this.completeLogin(user);
	}
	
	//=========================================================================
	// PUBLIC API - CHANGE PASSWORD
	//=========================================================================
	
	async changePassword(userId: string, oldPassword: string, newPassword: string):Promise<void> {
		const user = await this.fetchUserById(userId);
		
		const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
		
		if (!isPasswordValid) {
			throw new Error(`Password actual incorrecta`);
		}
		
		const newPasswordHash = await bcrypt.hash(newPassword, 10);
		
		const updateResponse = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/${user.id}/password`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': `${AuthEnv.SERVICE_SECRET}`
				},
				body: JSON.stringify({newPasswordHash})
			}
		);
		
		if (!updateResponse.ok) {
			throw new Error(`Fallo al actualizar password: ${updateResponse.status}`);
			// TODO Es necesario un SharedError nuevo para manejar este error?
		}
	}
	
	// ========================================================================
	// PUBLIC API - 2FA MANAGEMENT
	// ========================================================================
	
	async enable2FA(userId: string): Promise<AuthTypes.Enable2FAResponse> {
		
		const user = await this.fetchUserById(userId);
		
		if (user.has2FAEnabled) {
			throw new SharedErrors.ConflictError('2FA ya está activado', 'has2FAEnabled');
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
			throw new SharedErrors.UnauthorizedError('SetupToken es inválido o expirado');
		
		// Verificar límite de intentos
		const MAX_ATTEMPTS = AuthConstants.SETUP_MAX_ATTEMPTS;
		const attempts = (setupData.attempts || 0) + 1;
		
		// Si son demasiados, borrar el setupToken del cache, terminar
		if (attempts > MAX_ATTEMPTS) {
			await this.setupCache.delete(setupToken);
			throw new SharedErrors.UnauthorizedError(
				`Demasiados intentos fallidos. Solicita un nuevo código QR.`
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
			throw new SharedErrors.UnauthorizedError(`Código 2FA inválido. ${remaining} intentos restantes de ${MAX_ATTEMPTS}`);
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
			throw new SharedErrors.UnauthorizedError('Credenciales inválidas');
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
			throw new SharedErrors.UnauthorizedError('2FA no está habilitado');
		
		const isValid = await bcrypt.compare(backupCode, user.backupCodeHash);
		
		if (!isValid)
			throw new SharedErrors.UnauthorizedError('Código de recuperación inválido');
		
		// Desactivar 2FA
		await this.update2FAStatus(userId, false);
		
		// Completar login
		return await this.completeLogin(user, false);
	}
}
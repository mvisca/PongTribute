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
	SharedErrors
} from '@transcendence/shared';
import { AuthEnv } from '../config.js';
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
	
	// LOGIN PROCESS 
	
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
		
		// Crear payload usuario
		const userPayload: AuthTypes.UserPayload = {
			id: user.id,
			username: user.username,
			email: user.email,
			has2FAEnabled
		};
		
		// Generar tokens
		const accessToken = this.generateJWT(userPayload, true, AuthEnv.TOKEN_EXPIRY);
		const refreshToken = await this.createAndStoreRefreshToken(user.id, true);
		
		return {
			token: accessToken,
			refreshToken,
			user: userPayload
		};
	}
	
	// JWT MANGEMENT
	
	/** Verify password against hash */
	private async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
		return await bcrypt.compare(password, passwordHash);
	}
	
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
		const expiresAt = new Date(Date.now() + ms(AuthEnv.REFRESH_TOKEN_EXPIRY));
		
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
	
	/** Delete all refresh tokens for a user */
	private async deleteRefreshTokensById(userId: string): Promise<void> {
		try {
			await fetch(`${AuthEnv.USER_SERVICE_URL}/internal/tokens/user/${userId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET
				}
			});			
		} catch {
			console.log('Fallo cerrando sesión de usaurio');
		}
	}
	
	// 2FA BACKUP CODE GENERATION AND TOTP CODE VERIFICATION
	
	/** Genera backup code en formato XXXX-XXXX */
	private generate2FABackupCode(): string {
		const bytes = crypto.randomBytes(4); // 4 bytes = 8 hex chars
		const hex = bytes.toString('hex').toUpperCase();
		return `${hex.slice(0,4)}-${hex.slice(4)}`
	}
	
	/** Verfica totp code recibido en login con 2FA */
	private verify2FATotpCode(secret: string, token: string): boolean {
		return speakeasy.totp.verify({
			secret,
			encoding: 'base32',
			token,
			window: 1 // +/- 1 intervalo de tiempo
		});
	}
	
	// PROVSIONAL TOKEN VERIFICATION
	
	/** Verificay parsea provisional token */
	private verifyProvisionalToken(token: string) {
		const payload = jwt.verify(token, AuthEnv.JWT_SECRET);
		
		if (typeof payload === 'string' || payload.purpose !== '2fa_verification')
			throw new SharedErrors.UnauthorizedError('Token provisional inválido');
		
		return payload as AuthTypes.ProvisionalTokenPayload;
	}
	
	// USER STATUS
	
	/** Actualiza el 2FA status del usuario */
	private async update2FAStatus(
		userId: string,
		enabled: boolean,
		totpSecret: string | null = null,
		backupCodeHash: string | null = null
	): Promise<void> {
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/${userId}/2fa-status`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET
				},
				body: JSON.stringify({
					has2FAEnabled: enabled,
					totpSecret,
					backupCodeHash
				})
			}
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
			console.error('Error updating 2FA status:', {
				status: response.status,
				errorData,
				requestBody: { has2FAEnabled: enabled, totpSecret, backupCodeHash }
			});
			throw new Error(`Fallo actualizando 2FA: ${response.status} - ${JSON.stringify(errorData)}`);
		}
	}
	
	/** Set user online/offline status */
	private async setUserIsOnline(userId: string, isOnline: boolean): Promise<void> {
		try {
			await fetch(`${AuthEnv.USER_SERVICE_URL}/internal/users/${userId}/online-status`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET
				},
				body: JSON.stringify({ isOnline })
			});
		} catch (err) {
			console.log('Fallo al actualizar online status: ', err);
			console.log('Login no ha sido bloqueado');
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
	// PUBLIC API - LOGIN / LOGOUT
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
					purpose: '2fa_verification', // TODO: AGREGAR A CONSTANTES DE AUTH
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
	
	/** Logout */
	async logout(userId: string): Promise<void> {
		await this.deleteRefreshTokensById(userId);
		await this.setUserIsOnline(userId, false);
	}
	
	// ========================================================================
	// PUBLIC API - LOGIN 2FA VERIFY
	// ========================================================================
	
	/** Completa el proceso de login con 2FA */
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
	
	async changePassword(userId: string, oldPassword: string, newPassword: string):Promise<boolean> {
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
		
		return true;
	} // TODO es necesario devolver true aquí? para qué?
	
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
			name: user.email,							// nombre en google authenticator (simplificado)
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
			backupCodeHash								// Para verificar en solicitud de recuperación
		};
		
		await this.setupCache.set(setupToken, setupData, 600); // 10 minutos TODO poner en .env y en SharedEnv
		
		return {
			setupToken,									// cliente lo devolverá en verify-2fa-setup
			backupCode,									// se mostrará en front para que usuario lo almacene
			qr											// se mostraré en front para activar authenticator
		};
	}
	
	async verify2FASetup(setupToken: string, totpCode: string): Promise<void> {
		// Recuperar setupData de setupCache
		const setupData = await this.setupCache.get(setupToken) as AuthTypes.SetupTokenData
		if (!setupData)
			throw new SharedErrors.UnauthorizedError('SetupToken es inválido o expirado');
		
		// Verificar código totp XXXX-XXXX
		const verified = this.verify2FATotpCode(setupData.totpSecret, totpCode);
		if (!verified)
			throw new SharedErrors.UnauthorizedError('Código 2FA inválido');

		// Debug: validar formato antes de enviar
		console.log('Datos 2FA a enviar:', {
			totpSecretLength: setupData.totpSecret.length,
			totpSecretMatches: /^[A-Z2-7]+$/.test(setupData.totpSecret),
			backupCodeHashLength: setupData.backupCodeHash.length,
			backupCodeHashMatches: /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(setupData.backupCodeHash)
		});

		// Activar 2FA en user service
		await this.update2FAStatus(setupData.userId, true, setupData.totpSecret, setupData.backupCodeHash);
		
		// Limpiar setupCache
		await this.setupCache.delete(setupToken);
	}
	
	async disable2FA(userId: string, password: string): Promise<void> {
		
		// Recuperar user
		const user = await this.fetchUserById(userId);
		
		// Verificar password vs passwordHash
		const valid = await this.verifyPassword(password, user.passwordHash);
		
		if (!valid) {
			throw new SharedErrors.UnauthorizedError('Credenciales inválidas');
		}
		
		await this.update2FAStatus(userId, false);
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
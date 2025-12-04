import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRcode from 'qrcode';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserTypes, AuthTypes, SharedErrors } from '@transcendence/shared';
import { AuthEnv } from '../config.js';
import { create } from 'domain';
import { isInt32Array } from 'util/types';

export class AuthService {
	
	// ========================================================================
	// GETTER
	// ========================================================================
	
	private async fetchUserByEmail(email: string): Promise<UserTypes.UserInternal> {
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/by-email/${email}`,
			{ headers:{ 'X-Service-Secret': AuthEnv.SERVICE_SECRET } }
		)
		
		if (!response.ok) {
			throw new SharedErrors.NotFoundError('Usuario no encontrado', 'auth');
		}
		
		return await response.json() as UserTypes.UserInternal;
	}
	
	// ========================================================================
	// LOGIN / LOGOUT
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
			
			const minutes = 1;
			const expiresIn = minutes * 60; 
			const provisionalToken = jwt.sign(
				{
					userId: user.id,
					email: user.email,
					purpose: '2fa_verification',
					iat: Math.floor(Date.now() / 1000)
				},
				AuthEnv.JWT_SECRET,
				{ expiresIn: expiresIn }
			);
			
			return {
				twoFactorRequired: true,
				userId: user.id,
				provisionalToken,
				expiresIn
			};
		}
		
		// Flujo de login sin 2A
		if (AuthEnv.UNIQUE_SESSION === true)
			await this.deleteUserTokens(user.id);
		await this.setUserOnline(user.id, true);
		
		const userPayload = {
			id: user.id,
			username: user.username,
			email: user.email
		};
		
		const accessToken = this.generateToken(userPayload, true); // quizas deba ser false, porque no se mira que sea true si si2FAEnables es false
		const refreshToken = await this.createAndStoreRefreshToken(user.id, true);

		return {
			token: accessToken,
			refreshToken: refreshToken,
			user: userPayload
		};
	}
	
	/** Logout */
	async logout(userId: string): Promise<void> {
		await this.deleteUserTokens(userId);
		await this.setUserOnline(userId, false);
	}
	
	// VERIFY PASSWORD
	/** Login Helper Verify Password */
	private async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
		return await bcrypt.compare(password, passwordHash);
	}
	
	// GENERATE ACCESS TOKEN
	/** Login Helper Generate Token */
	private generateToken(
		user: AuthTypes.UserPayload,
		is2FAVerified: boolean
	): string {	
		return jwt.sign(
			{
				...user,
				is2FAVerified
			},
			AuthEnv.JWT_SECRET,
			{ expiresIn: AuthEnv.TOKEN_EXPIRY } as SignOptions
		);
	}
	
	// DELETE REFRESH TOKEN
	/** Logout Helper Delete User Tokens */
	private async deleteUserTokens(userId: string): Promise<void> {
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
	
	// CREATE AND STORE REFRESH TOKEN
	/** Login w/2FA Process Helper to create and store refresh tokens */
	private async createAndStoreRefreshToken(
		userId: string,
		is2FAVerified: boolean
	): Promise<string> {
		
		// generar refresh token random
		const refreshToken = crypto.randomBytes(32).toString('hex');

		// hashear con sha-256 (64 caracteres)
		const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
		
		//TODO la expiracion calcularla con el AuthEnv.Expiry o similar
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
		
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
	
	// SETTER
	/** SET USER ONLINE */
	private async setUserOnline(userId: string, isOnline: boolean): Promise<void> {
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
	
	// ========================================================================
	// LOGIN 2FA VERIFY
	// ========================================================================
	
	/** Completa el proceso de login con 2FA */
	async verify2FAWithToken(provisionalToken: string, totpCode: string): Promise<AuthTypes.LoginResponse> {
		// Verificar token provisional con user payload
		const payload = jwt.verify(provisionalToken, AuthEnv.JWT_SECRET);
		
		if (typeof payload === 'string' || payload.purpose !== '2fa_verification') {
			throw new SharedErrors.UnauthorizedError('Token inválido');
		}
		
		const userId = payload.id;
		
		// OBtener el usuario internal con totpSecret
		const userResponse = await fetch(`${AuthEnv.USER_SERVICE_URL}/internal/users/by-id/${userId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-Service-Secret': AuthEnv.SERVICE_SECRET
			}
		});
		
		if (!userResponse.ok) {
			throw new SharedErrors.UnauthorizedError('No se puede acceder al usuario');
		}
		
		const user = await userResponse.json() as UserTypes.UserInternal;
		
		// Verificar que 2FA esté habilitado
		if (!user.has2FAEnabled || !user.totpSecret) {
			throw new SharedErrors.UnauthorizedError('2FA no está habilitado para este usuario');
		}
		
		// Veerificar código totp
		const verified = speakeasy.totp.verify({
			secret: user.totpSecret,
			encoding: 'base32',
			token: totpCode,
			window: 1 // +/- 1 intervalo de tiempo
		});
		
		if (!verified) {
			throw new SharedErrors.UnauthorizedError('Codigo 2FA inválido');
		}
		
		// actualizar tokens de refresh, estado online y generar access token
		if (AuthEnv.UNIQUE_SESSION === true) {
			await this.deleteUserTokens(user.id);
		}
		
		// establecer usuario online
		await this.setUserOnline(userId, true);
		
		// crear payload del usuario
		const userPayload = {
			id: user.id,
			username: user.username,
			email: user.email
		};
		
		// generar acceso token con is2FAVerified true
		const accessToken = this.generateToken(userPayload, true);
		
		// generar y almacenar refresh token con is2FAVerified true
		const refreshToken = await this.createAndStoreRefreshToken(user.id, true);

		return {
			token: accessToken,
			refreshToken: refreshToken,
			user: userPayload
		};
	}
	
	//=========================================================================
	// CHANGE PASSWORD
	//=========================================================================
	
	async changePassword(userId: string, oldPassword: string, newPassword: string):Promise<boolean> {
		const userResponse = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/by-id/${userId}`,
			{ headers: {'X-Service-Secret': `${AuthEnv.SERVICE_SECRET}`} }
		);
		
		if (!userResponse.ok) {
			if (userResponse.status === 404) {
				throw new SharedErrors.NotFoundError('Usuario no encontrado', 'auth');
			}
			throw new Error(`User service error: ${userResponse.status}`);
		}
		
		const user = await userResponse.json() as UserTypes.UserInternal;
		
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
			// TODO Crear un tipo de SharedError usuario nuevo
		}
		
		return true;
	}
}
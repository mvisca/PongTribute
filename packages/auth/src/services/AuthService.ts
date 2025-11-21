import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserTypes, AuthTypes } from '@transcendence/shared';
import { AuthEnv } from '../config';
import { authRoutes } from 'src/routes/authRoutes';

export class AuthService {
	
	private async fetchUserByEmail(
		email: string
	): Promise<UserTypes.UserInternal | null> {
		const response = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/by-email/${email}`,
			{ headers:{ 'X-Service-Secret': AuthEnv.SERVICE_SECRET } }
		)

		if (!response.ok) {
			if (response.status === 404) return null;
			console.log('ERROR:', response.json());
			throw new Error(`User service error: ${response.status}`);
		}

		return await response.json() as UserTypes.UserInternal;
	}

	private async verifyPassword(
		password: string,
		passwordHash: string
	): Promise<boolean> {
		return await bcrypt.compare(password, passwordHash);
	}

	private generateToken(
		user: AuthTypes.UserPayload
	): string {	
		return jwt.sign(
			user,
			AuthEnv.JWT_SECRET,
			{ expiresIn: AuthEnv.TOKEN_EXPIRY } as SignOptions
		);
	}
 
	async login(
		email: string,
		password: string
	): Promise<AuthTypes.LoginResponse | null> {

		const user = await this.fetchUserByEmail(email);		
		if (!user) return null;

		const valid = await this.verifyPassword(password, user.passwordHash);
		if (!valid) return null;

		const userPayload = {
			id: user.id,
			username: user.username,
			email: user.email
		};

		return {
			token: this.generateToken(userPayload),
			user: userPayload
		};
	}

	async changePassword(
		userId: string,
		oldPassword: string,
		newPassword: string
	):Promise<boolean> {
		const userResponse = await fetch(
			`${AuthEnv.USER_SERVICE_URL}/internal/users/by-id/${userId}`,
			{
				headers: {
					'X-Service-Secret': `${AuthEnv.SERVICE_SECRET}`
				}
			}
		);

		if (!userResponse.ok) {
			if (userResponse.status === 404) {
				throw new Error('Usuario no encontrado');
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
		}

		return true;
	}
}
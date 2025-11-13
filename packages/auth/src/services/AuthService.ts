import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserTypes } from '@transcendence/shared';
import { AuthEnv } from '../config';
import { AuthTypes } from '../schemas/authSchemas';
import { Sign } from 'crypto';

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
			{ expiresIn: AuthEnv.JWT_EXPIRES_IN } as SignOptions
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

}
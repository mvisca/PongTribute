import { createLogger, type AppLogger } from '@transcendence/shared';
import {
	AuthTypes,
	AuthConstants,
	UserTypes,
	SharedErrors,
} from '@transcendence/shared';
import { AuthEnv } from '../index.js';
import type { Redis } from 'ioredis';
import { AuthService } from './auth.service.js';
import { OAuthProfile } from '../providers/oauth.provider.js';
import { TokenPair } from '../types.js';
import crypto from 'crypto';

export class OAuthService {

	// ========================================================================
	// PROPIEDADES
	// ========================================================================
	private redisClient: Redis;
	private authService: AuthService;
	private log: AppLogger;

	// ========================================================================
	// CONSTRUCTOR
	// ========================================================================
	constructor(
		redisClient: Redis,
		authService: AuthService
	) {
		this.redisClient = redisClient;
		this.authService = authService;
		this.log = createLogger('OAuthService');
	}

	// ========================================================================
	// STATE MANAGEMENT
	// ========================================================================

	/** Genera un state token y lo guarda en Redis con TTL de 600s */
	public async generateStateToken(provider: AuthTypes.AuthProvider): Promise<string> {
		const state = crypto.randomUUID();
		const key = `oauth:state:${state}`;

		try {
			await this.redisClient.set(key, provider, 'EX', 600);
			this.log.info({ state, provider }, 'Generated OAuth state token');
			return state;
		} catch (err) {
			this.log.error({ err, state, provider }, 'Failed to generate OAuth state token');
			throw new Error('Failed to generate OAuth state token');
		}
	}

	/** Valida y consume un state token (single-use) */
	public async validateAndConsumeStateToken(state: string): Promise<AuthTypes.AuthProvider> {
		const key = `oauth:state:${state}`;

		try {
			const provider = await this.redisClient.get(key);

			if (!provider) {
				this.log.warn({ state }, 'Invalid or expired OAuth state token');
				throw new SharedErrors.UnauthorizedError('Invalid or expired OAuth state');
			}

			// Validar que el provider sea válido
			if (!AuthConstants.OAUTH_PROVIDERS.includes(provider as AuthTypes.OAuthProviderName)) {
				this.log.warn({ state, provider }, 'Invalid OAuth provider in state token');
				throw new SharedErrors.UnauthorizedError('Invalid OAuth provider');
			}

			// Borrar el token (single-use)
			await this.redisClient.del(key);
			this.log.info({ state, provider }, 'Consumed OAuth state token');

			return provider as AuthTypes.AuthProvider;
		} catch (err) {
			this.log.error({ err, state }, 'Failed to validate OAuth state token');
			if (err instanceof SharedErrors.UnauthorizedError) {
				throw err;
			}
			throw new SharedErrors.UnauthorizedError('Invalid OAuth state');
		}
	}

	// ========================================================================
	// USER UPSERT LOGIC
	// ========================================================================

	/** Resuelve el usuario OAuth (crea, vincula o retorna existente) */
	public async upsertOAuthUser(
		profile: OAuthProfile,
		provider: AuthTypes.AuthProvider
	): Promise<UserTypes.UserInternal> {
		const userServiceUrl = AuthEnv.USER_SERVICE_URL();
		const headers = { 'X-Service-Secret': AuthEnv.SERVICE_SECRET() };

		try {
			// Caso 1: Buscar usuario por OAuth (provider + providerId)
			const oauthResponse = await fetch(
				`${userServiceUrl}/internal/users/by-oauth/${provider}/${profile.providerId}`,
				{ headers, signal: AbortSignal.timeout(5000) }
			);

			if (oauthResponse.ok) {
				const user = await oauthResponse.json() as UserTypes.UserInternal;
				if (!user.isDeleted) {
					this.log.info({ userId: user.id, provider }, 'Found existing OAuth user');
					return user;
				}
				this.log.info({ userId: user.id, provider }, 'OAuth user is deleted, creating new account');
			}

			// Caso 2: Buscar usuario por email
			const emailResponse = await fetch(
				`${userServiceUrl}/internal/users/by-email/${profile.email}`,
				{ headers, signal: AbortSignal.timeout(5000) }
			);

			if (emailResponse.ok) {
				const user = await emailResponse.json() as UserTypes.UserInternal;
				if (!user.isDeleted) {
					// Vincular OAuth al usuario existente
					const linkResponse = await fetch(
						`${userServiceUrl}/internal/users/${user.id}/link-oauth`,
						{
							method: 'POST',
							headers: { ...headers, 'Content-Type': 'application/json' },
							body: JSON.stringify({ provider, oauthId: profile.providerId }),
							signal: AbortSignal.timeout(5000)
						}
					);

					if (!linkResponse.ok) {
						throw new Error('Failed to link OAuth to existing user');
					}

					const updatedUser = await linkResponse.json() as UserTypes.UserInternal;
					this.log.info({ userId: updatedUser.id, provider }, 'Linked OAuth to existing user');
					return updatedUser;
				}
				this.log.info({ userId: user.id, provider }, 'Email matches deleted user, creating new account');
			}

			// Caso 3: Crear nuevo usuario OAuth
			const createResponse = await fetch(`${userServiceUrl}/internal/users/create-oauth`, {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: profile.username,
					email: profile.email,
					authProvider: provider,
					oauthId: profile.providerId,
					avatar: profile.avatar
				}),
				signal: AbortSignal.timeout(5000)
			});

			if (!createResponse.ok) {
				const errBody = await createResponse.json().catch(() => ({})) as { message?: string };
				throw new Error(`Failed to create OAuth user: ${errBody.message ?? createResponse.statusText}`);
			}

			const newUser = await createResponse.json() as UserTypes.UserInternal;
			this.log.info({ userId: newUser.id, provider }, 'Created new OAuth user');
			return newUser;

		} catch (err) {
			this.log.error({ err, provider, email: profile.email }, 'Failed to upsert OAuth user');
			throw new Error('Failed to complete OAuth login');
		}
	}

	// ========================================================================
	// LOGIN COMPLETION
	// ========================================================================

	/** Completa el login OAuth generando tokens */
	public async completeOAuthLogin(user: UserTypes.UserInternal): Promise<TokenPair> {
		try {
			const tokens = await this.authService.completeLoginForOAuth(user);
			this.log.info({ userId: user.id }, 'Completed OAuth login');
			return tokens;
		} catch (err) {
			this.log.error({ err, userId: user.id }, 'Failed to complete OAuth login');
			throw new Error('Failed to generate OAuth tokens');
		}
	}
}
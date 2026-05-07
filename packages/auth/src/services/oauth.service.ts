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
			if (!AuthConstants.OAUTH_PROVIDERS.includes(provider as AuthTypes.AuthProvider)) {
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
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		try {
			// Caso 1: Buscar usuario por OAuth (provider + providerId)
			const oauthResponse = await fetch(
				`http://user-service/internal/users/by-oauth/${provider}/${profile.providerId}`,
				{
					headers: { 'X-Service-Secret': AuthEnv.SERVICE_SECRET() },
					signal: controller.signal
				}
			);

			if (oauthResponse.ok) {
				const user = await oauthResponse.json() as UserTypes.UserInternal;
				this.log.info({ userId: user.id, provider }, 'Found existing OAuth user');
				return user;
			}

			// Caso 2: Buscar usuario por email
			const emailResponse = await fetch(
				`http://user-service/internal/users/by-email/${profile.email}`,
				{
					headers: { 'X-Service-Secret': AuthEnv.SERVICE_SECRET() },
					signal: controller.signal
				}
			);

			if (emailResponse.ok) {
				const user = await emailResponse.json() as UserTypes.UserInternal;

				// Vincular OAuth al usuario existente
				const linkResponse = await fetch(
					`http://user-service/internal/users/${user.id}/link-oauth`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'X-Service-Secret': AuthEnv.SERVICE_SECRET()
						},
						body: JSON.stringify({ provider, oauthId: profile.providerId }),
						signal: controller.signal
					}
				);

				if (!linkResponse.ok) {
					throw new Error('Failed to link OAuth to existing user');
				}

				const updatedUser = await linkResponse.json() as UserTypes.UserInternal;
				this.log.info({ userId: updatedUser.id, provider }, 'Linked OAuth to existing user');
				return updatedUser;
			}

			// Caso 3: Crear nuevo usuario OAuth
			const createResponse = await fetch('http://user-service/internal/users/create-oauth', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Service-Secret': AuthEnv.SERVICE_SECRET()
				},
				body: JSON.stringify({
					username: profile.username,
					email: profile.email,
					authProvider: provider,
					oauthId: profile.providerId,
					avatar: profile.avatar
				}),
				signal: controller.signal
			});

			if (!createResponse.ok) {
				throw new Error('Failed to create OAuth user');
			}

			const newUser = await createResponse.json() as UserTypes.UserInternal;
			this.log.info({ userId: newUser.id, provider }, 'Created new OAuth user');
			return newUser;

		} catch (err) {
			this.log.error({ err, profile, provider }, 'Failed to upsert OAuth user');
			throw new Error('Failed to complete OAuth login');
		} finally {
			clearTimeout(timeoutId);
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
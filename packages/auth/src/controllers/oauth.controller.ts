import { FastifyRequest, FastifyReply } from "fastify";
import { AuthTypes, AuthConstants, SharedErrors } from "@transcendence/shared";
import { OAuthService } from "../services/oauth.service.js";
import { IOAuthProvider } from "../providers/oauth.provider.js";
import { AuthEnv } from "../index.js";

function frontendUrl(): string {
	try {
		return new URL(AuthEnv.OAUTH_42_REDIRECT_URI()).origin;
	} catch {
		return 'https://localhost:8443';
	}
}

export class OAuthController {

	private oauthService: OAuthService;
	private providers: Map<string, IOAuthProvider>;

	constructor(oauthService: OAuthService, providers: Map<string, IOAuthProvider>) {
		this.oauthService = oauthService;
		this.providers = providers;
	}

	/** Redirect to OAuth provider authorization URL */
	async authorize(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { provider } = request.params as { provider: string };

			// Validate provider
			if (!AuthConstants.OAUTH_PROVIDERS.includes(provider as AuthTypes.OAuthProviderName)) {
				return reply.code(400).send({ error: 'Invalid OAuth provider' });
			}

			// Generate state token
			const state = await this.oauthService.generateStateToken(provider as AuthTypes.AuthProvider);

			// Get provider instance
			const providerInstance = this.providers.get(provider);
			if (!providerInstance) {
				return reply.code(400).send({ error: 'Provider not configured' });
			}

			// Redirect to provider
			const authUrl = providerInstance.getAuthorizationUrl(state);
			return reply.redirect(authUrl);

		} catch (err) {
			return reply.code(500).send({ error: 'OAuth authorization failed' });
		}
	}

	/** OAuth callback handler */
	async callback(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { provider } = request.params as { provider: string };
			const { code, state } = request.query as { code?: string; state?: string };

			// Validate required parameters
			if (!code || !state) {
				return reply.redirect(`${frontendUrl()}/login?error=missing_params`);
			}

			// Validate and consume state token
			let providerName: AuthTypes.AuthProvider;
			try {
				providerName = await this.oauthService.validateAndConsumeStateToken(state);
			} catch (err) {
				return reply.redirect(`${frontendUrl()}/login?error=invalid_state`);
			}

			// Get provider instance
			const providerInstance = this.providers.get(provider);
			if (!providerInstance) {
				return reply.redirect(`${frontendUrl()}/login?error=invalid_provider`);
			}

			// Exchange code for access token
			let accessToken: string;
			try {
				accessToken = await providerInstance.exchangeCode(code);
			} catch (err) {
				return reply.redirect(`${frontendUrl()}/login?error=exchange_failed`);
			}

			// Get user profile
			let profile;
			try {
				profile = await providerInstance.getProfile(accessToken);
			} catch (err) {
				return reply.redirect(`${frontendUrl()}/login?error=profile_failed`);
			}

			// Upsert user
			let user;
			try {
				user = await this.oauthService.upsertOAuthUser(profile, providerName);
			} catch (err) {
				return reply.redirect(`${frontendUrl()}/login?error=upsert_failed`);
			}

			// Complete OAuth login
			let tokens;
			try {
				tokens = await this.oauthService.completeOAuthLogin(user);
			} catch (err) {
				return reply.redirect(`${frontendUrl()}/login?error=login_failed`);
			}

			// Redirect to frontend with access token
			return reply.redirect(`${frontendUrl()}/auth/callback?token=${tokens.accessToken}`);

		} catch (err) {
			return reply.redirect(`${frontendUrl()}/login?error=oauth_failed`);
		}
	}
}

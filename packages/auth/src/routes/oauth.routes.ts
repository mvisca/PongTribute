import { FastifyPluginAsync } from "fastify";
import { OAuthController } from "../controllers/oauth.controller.js";
import { AuthAppDependencies } from "../app.js";
import { Intra42Provider } from "../providers/intra42.provider.js";
import { OAuthService } from "../services/oauth.service.js";

export const oauthRoutes: FastifyPluginAsync<AuthAppDependencies> = async (app, opts) => {

	// Create providers map
	const providers = new Map<string, any>();
	providers.set('42', new Intra42Provider());

	// Create OAuth controller
	const oauthController = new OAuthController(opts.oauthService, providers);

	// ============================================================================
	// PUBLIC OAUTH ROUTES
	// ============================================================================

	/** Redirect to OAuth provider authorization URL */
	app.get('/oauth/:provider/authorize', {
		handler: oauthController.authorize.bind(oauthController)
	});

	/** OAuth callback handler */
	app.get('/oauth/:provider/callback', {
		handler: oauthController.callback.bind(oauthController)
	});
};
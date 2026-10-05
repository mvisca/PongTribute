import { FastifyPluginAsync } from "fastify";
import { OAuthController } from "../controllers/oauth.controller.js";
import { AuthAppDependencies } from "../app.js";
import { Intra42Provider } from "../providers/intra42.provider.js";
import { GoogleProvider } from "../providers/google.provider.js";
import { GitHubProvider } from "../providers/github.provider.js";
import { IOAuthProvider } from "../providers/oauth.provider.js";

export const oauthRoutes: FastifyPluginAsync<AuthAppDependencies> = async (app, opts) => {

	const providers = new Map<string, IOAuthProvider>([
		['42',     new Intra42Provider()],
		['google', new GoogleProvider()],
		['github', new GitHubProvider()],
	]);

	const oauthController = new OAuthController(opts.oauthService, providers);

	// ============================================================================
	// PUBLIC OAUTH ROUTES — prefix '/api' → full path '/api/auth/oauth/...'
	// ============================================================================

	app.get('/auth/oauth/:provider/authorize', {
		handler: oauthController.authorize.bind(oauthController)
	});

	app.get('/auth/oauth/:provider/callback', {
		handler: oauthController.callback.bind(oauthController)
	});
};

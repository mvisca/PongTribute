import { AuthEnv } from "../config.js";
import { IOAuthProvider, OAuthProfile } from "./oauth.provider.js";

const GOOGLE_URLS = {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token:     'https://oauth2.googleapis.com/token',
    profile:   'https://www.googleapis.com/oauth2/v3/userinfo',
} as const;

interface GoogleUserResponse {
    sub: string;
    email: string;
    name: string;
    picture?: string;
}

export class GoogleProvider implements IOAuthProvider {

	readonly name = 'google';

	public getAuthorizationUrl(state: string): string {

		const params = new URLSearchParams({
			client_id:     AuthEnv.OAUTH_GOOGLE_CLIENT_ID(),
			redirect_uri:  AuthEnv.OAUTH_GOOGLE_REDIRECT_URI(),
			response_type: 'code',
			scope:         'openid email profile',
			state:         state,
		});

		return `${GOOGLE_URLS.authorize}?${params.toString()}`;
	}

	public async exchangeCode(code: string): Promise<string> {
		const params = new URLSearchParams({
			grant_type:    'authorization_code',
			client_id:     AuthEnv.OAUTH_GOOGLE_CLIENT_ID(),
			client_secret: AuthEnv.OAUTH_GOOGLE_CLIENT_SECRET(),
			code:          code,
			redirect_uri:  AuthEnv.OAUTH_GOOGLE_REDIRECT_URI(),
		});

		const response = await fetch(GOOGLE_URLS.token, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`Google token exchange failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json() as Record<string, unknown>;
		return data.access_token as string;
	}

	public async getProfile(accessToken: string): Promise<OAuthProfile> {
		const profile = await fetch(GOOGLE_URLS.profile, {
			method: 'GET',
			headers: { Authorization: `Bearer ${accessToken}` }
		});

		if (!profile.ok) {
			throw new Error('Google profile error');
		}

		const data = await profile.json() as GoogleUserResponse;

		return {
			providerId:    String(data.sub),
			email:         data.email,
			username:      data.name,
			avatar:        data.picture ?? undefined,
			emailVerified: true,
		};
	}
}
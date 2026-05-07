import { AuthEnv } from "../config.js";
import { IOAuthProvider, OAuthProfile } from "./oauth.provider.js";

const INTRA42_URLS = {
    authorize: 'https://api.intra.42.fr/oauth/authorize',
    token:     'https://api.intra.42.fr/oauth/token',
    profile:   'https://api.intra.42.fr/v2/me',
} as const;

interface Intra42UserResponse {
  id: number;
  login: string;
  email: string;
  image: { link: string | null } | null;
  }

export class Intra42Provider implements IOAuthProvider {

	readonly name = '42';

	public getAuthorizationUrl(state: string): string {

		const params = new URLSearchParams({
			client_id:		AuthEnv.OAUTH_42_CLIENT_ID(),
			redirect_uri:	AuthEnv.OAUTH_42_REDIRECT_URI(),
			response_type:	'code',
			scope:			'public',
			state:			state,
		});

		return `${INTRA42_URLS.authorize}?${params.toString()}`;
	}

	public async exchangeCode(code: string): Promise<string> {
		const params = new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: AuthEnv.OAUTH_42_CLIENT_ID(),
			client_secret: AuthEnv.OAUTH_42_CLIENT_SECRET(),
			code: code,
			redirect_uri: AuthEnv.OAUTH_42_REDIRECT_URI(),
		});

		const response = await fetch(INTRA42_URLS.token, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`42 token exchange failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data.access_token as string;
	}

	public async getProfile(accessToken: string): Promise<OAuthProfile> {
		const profile = await fetch(INTRA42_URLS.profile, {
			method: 'GET',
			headers: { Authorization: `Bearer ${accessToken}` }
		});

		if (!profile.ok) {
			throw new Error('42 profile error');
		}

		const data = await profile.json() as Intra42UserResponse;

		return {
			providerId:		String(data.id),
			email:			data.email,
			username:		data.login,
			avatar:			data.image?.link ?? undefined,
			emailVerified:	true,
		};
	}
}
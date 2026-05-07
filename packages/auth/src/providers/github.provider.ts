import { AuthEnv } from "../config.js";
import { IOAuthProvider, OAuthProfile } from "./oauth.provider.js";

const GITHUB_URLS = {
    authorize: 'https://github.com/login/oauth/authorize',
    token:     'https://github.com/login/oauth/access_token',
    profile:   'https://api.github.com/user',
    emails:    'https://api.github.com/user/emails',
} as const;

interface GitHubUserResponse {
    id: number;
    login: string;
    name: string | null;
    avatar_url?: string;
    email: string | null;
}

interface GitHubEmailResponse {
    email: string;
    primary: boolean;
    verified: boolean;
}

export class GitHubProvider implements IOAuthProvider {

	readonly name = 'github';

	public getAuthorizationUrl(state: string): string {

		const params = new URLSearchParams({
			client_id:     AuthEnv.OAUTH_GITHUB_CLIENT_ID(),
			redirect_uri:  AuthEnv.OAUTH_GITHUB_REDIRECT_URI(),
			response_type: 'code',
			scope:         'read:user user:email',
			state:         state,
		});

		return `${GITHUB_URLS.authorize}?${params.toString()}`;
	}

	public async exchangeCode(code: string): Promise<string> {
		const params = new URLSearchParams({
			client_id:     AuthEnv.OAUTH_GITHUB_CLIENT_ID(),
			client_secret: AuthEnv.OAUTH_GITHUB_CLIENT_SECRET(),
			code:          code,
			redirect_uri:  AuthEnv.OAUTH_GITHUB_REDIRECT_URI(),
		});

		const response = await fetch(GITHUB_URLS.token, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`GitHub token exchange failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data.access_token as string;
	}

	public async getProfile(accessToken: string): Promise<OAuthProfile> {
		// Get user profile
		const profileResponse = await fetch(GITHUB_URLS.profile, {
			method: 'GET',
			headers: { Authorization: `Bearer ${accessToken}` }
		});

		if (!profileResponse.ok) {
			throw new Error('GitHub profile error');
		}

		const userData = await profileResponse.json() as GitHubUserResponse;

		// If email is null, fetch emails
		let email = userData.email;
		if (!email) {
			const emailsResponse = await fetch(GITHUB_URLS.emails, {
				method: 'GET',
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			if (emailsResponse.ok) {
				const emails = await emailsResponse.json() as GitHubEmailResponse[];
				const primaryEmail = emails.find(e => e.primary && e.verified);
				if (primaryEmail) {
					email = primaryEmail.email;
				}
			}
		}

		if (!email) {
			throw new Error('GitHub email not found');
		}

		return {
			providerId:    String(userData.id),
			email:         email,
			username:      userData.login,
			avatar:        userData.avatar_url ?? undefined,
			emailVerified: true,
		};
	}
}
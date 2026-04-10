// ============================================================================
// AUTH PROVISIONAL TOKEN LIFETIME
// ============================================================================
export namespace AuthConstants {
	export const PROVISIONAL_TOKEN_LIFETIME = 120;
	export const TOKEN_PURPOSE_2FA_VERIFICATION = '2fa_verification' as const;
	export const SETUP_TOKEN_TTL = 600;
	export const SETUP_MAX_ATTEMPTS = 3;
	// OAUTH providers supported
	export const OAUTH_PROVIDERS = [ '42', 'google', 'github'] as const;
}
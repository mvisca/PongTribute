import type { AuthTypes } from "@transcendence/shared";

export type TokenPair = {
	accessToken: string;
	refreshToken: string;
	userPayload: AuthTypes.UserPayload;
};
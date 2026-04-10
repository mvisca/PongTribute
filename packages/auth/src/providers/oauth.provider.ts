/** Objetivo: autenticar usuarios sin importar de dónde vienen y entregarlo a completeLogin() siempre igual.
 * De este modo se podría implementar múltipes providers de 0Auth con la misma interfaz
 * Cada provider requiere una forma distinta de obtener el perfil.
 * Lo que no varía es qué hacer con ese perfil
 */

import { AuthTypes } from "@transcendence/shared/types/auth.types.js";

/** Profile normalizado , lo que extrar de cualquier provider */
export interface OAuthProfile {
	providerId:		string;
	email: 			string;
	username:		string;
	avatar?:		string;
	emailVerified:	boolean;
};

export interface IOAuthProvider {
	readonly name: AuthTypes.OAuthProviderName;
	getAuthorizationUrl(state: string): string; // Solo construye URL, no hace fetch
	exchangeCode(code: string): Promise<string>;
	getProfile(accessToken: string): Promise<OAuthProfile>;
};
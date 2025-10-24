/**
 * Tipos branded para IDs únicos
 * Distingue entidades con mismo tipo base (string)
 */
export type EventId = string & { readonly __brand: "EventId" };
export type UserId = string & { readonly __brand: "UserId" };
export type MatchId = string & { readonly __brand: "MatchId" };
export type GameId = string & { readonly __brand: "GameId" };
export type TournamentId = string & { readonly __brand: "TournamentId" };

/**
 * Tipo branded para emails
 * Para no confundir un string común con un email válido
 */
export type Email = string & { readonly __brand: "Email" };

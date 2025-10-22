/**
 * Tipos branded para IDs únicos.
 */
export type EventId = string & {
    readonly __brand: 'EventId';
};
export type UserId = string & {
    readonly __brand: 'UserId';
};
export type MatchId = string & {
    readonly __brand: 'MatchId';
};
export type GameId = string & {
    readonly __brand: 'GameId';
};
export type TournamentId = string & {
    readonly __brand: 'TournamentId';
};
export type Email = string & {
    readonly __brand: 'Email';
};
//# sourceMappingURL=branded.types.d.ts.map
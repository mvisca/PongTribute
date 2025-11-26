// utils/index.ts
import * as Normalizers from './normalizers.js';
import * as Generators from './uuidGenerator.js';

// Re-exportar plano para retrocompatibilidad
export const UserNormalizer = Normalizers.UserNormalizer;
export const generateUserId = Generators.userId;
export const generateTokenId = Generators.tokenId;
export const generateMatchId = Generators.matchId;
export const generateEventId = Generators.eventId;
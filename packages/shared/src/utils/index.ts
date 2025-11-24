// utils/index.ts
import * as Normalizers from './normalizers.js';
import * as Generators from './uuidGenerator.js';

// Re-exportar plano para retrocompatibilidad
export const UserNormalizer = Normalizers.UserNormalizer;
export const generateUserId = Generators.UserId;
export const generateMatchId = Generators.MatchId;
export const generateEventId = Generators.EventId;
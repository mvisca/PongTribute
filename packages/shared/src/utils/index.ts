// utils/index.ts
import * as Normalizers from './normalizers.js';
import * as Generators from './uuidGenerator.js';
import { RedisCache } from './RedisCache.js';
import * as RedisFactory from './redisClient.js'; 

export { RedisCache };
export * from './validators.js';
export * from './logger.js';

// Re-exportar plano para retrocompatibilidad
export const Utils = { 	
	UserNormalizer: Normalizers.UserNormalizer,
	generateUserId: Generators.userId,
	generateTokenId: Generators.tokenId,
	generateMatchId: Generators.matchId,
	generateEventId: Generators.eventId,
	createRedisClient: RedisFactory.createRedisClient,
	RedisCache
}
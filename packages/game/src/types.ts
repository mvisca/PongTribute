import { Redis } from 'ioredis';
import { MatchService } from './services/MatchService.js';
import { GameService } from './services/GameService.js';

export interface GameAppDependencies {
	redisClient: Redis;
	matchService: MatchService;
	gameService: GameService;
}

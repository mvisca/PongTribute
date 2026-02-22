import { Redis } from 'ioredis';
import { MatchService } from './services/MatchService.js';
import { GameService } from './services/GameService.js';
import { MatchEventSubscriber } from './subscribers/MatchEventSubscriber.js';

export interface GameAppDependencies {
	redisClient: Redis;
	matchService: MatchService;
	gameService: GameService;
	eventSubscriber: MatchEventSubscriber;
}

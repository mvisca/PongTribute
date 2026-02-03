import { wsRoutes as WS } from './comms.routes.js';
import { healthRoutes as Health } from './health.routes.js';

export namespace CommsRoutes {
	export const wsRoutes = WS;
	export const healthRoutes = Health;
}
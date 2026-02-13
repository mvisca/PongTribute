import { CommsService } from '../comms.service.js';
import type { BaseEvent, EventHandler as SharedEventHandler } from '@transcendence/shared';

// Re-exportar tipos de shared para compatibilidad con código existente
export type { BaseEvent };

// Especializar EventHandler con CommsService concreto
export type EventHandler = SharedEventHandler<CommsService>;

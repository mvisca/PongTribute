import { CommsService } from '../comms.service.js';
import { EventHandler } from '@transcendence/shared';

// Especializar EventHandler con CommsService concreto.
// SharedEventHandler<TService> está definido en shared/event-handler.types.ts
// Necesita que TService implemente la interfaz IEventService.
// CommsService la implementa por eso es compatible-
export type CommsEventHandler = EventHandler<CommsService>;
// Para que typeScript sepa que el segundo argumento de handle() de los handlers especializados 
// es de tipo CommsService, y de autocompletado de los métodos de IEventService
// y todos los propios/prublicos de CommsService.

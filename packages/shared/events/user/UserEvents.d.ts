import { BaseEvent } from '../base/BaseEvent';
import { UserId } from '../../types/branded.types';
import { UserResponse } from '../../types/user.types';
/**
 * Evento: Usuario registrado exitosamente
 */
export declare class UserRegisteredEvent extends BaseEvent {
    readonly user: UserResponse;
    constructor(user: UserResponse);
    toJSON(): object;
}
/**
 * Evento: Usuario inició sesión
 */
export declare class UserLoggedInEvent extends BaseEvent {
    readonly userId: UserId;
    readonly alias: string;
    constructor(userId: UserId, alias: string);
    toJSON(): object;
}
/**
 * Evento: Usuario cerró sesión
 */
export declare class UserLoggedOutEvent extends BaseEvent {
    readonly userId: UserId;
    constructor(userId: UserId);
    toJSON(): object;
}
/**
 * Evento: Perfil de usuario actualizado
 */
export declare class UserProfileUpdatedEvent extends BaseEvent {
    readonly userId: UserId;
    readonly updatedFields: string[];
    constructor(userId: UserId, updatedFields: string[]);
    toJSON(): object;
}
/**
 * Evento: Usuario cambió estado online/offline
 */
export declare class UserStatusChangedEvent extends BaseEvent {
    readonly userId: UserId;
    readonly isOnline: boolean;
    constructor(userId: UserId, isOnline: boolean);
    toJSON(): object;
}
/**
 * Evento: Usuario eliminado
 */
export declare class UserDeletedEvent extends BaseEvent {
    readonly userId: UserId;
    constructor(userId: UserId);
    toJSON(): object;
}
//# sourceMappingURL=UserEvents.d.ts.map
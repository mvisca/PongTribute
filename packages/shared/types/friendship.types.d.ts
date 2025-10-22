import { UserId } from './branded.types';
import type { FriendshipStatus } from '../constants/friendship.constants';
/**
 * Entidad completa para BD
 */
export interface Friendship {
    userId: UserId;
    friendId: UserId;
    status: FriendshipStatus;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * DTO IN - Crear amistad
 */
export interface CreateFriendshipData {
    userId: UserId;
    friendId: UserId;
    status: FriendshipStatus;
}
/**
 * DTO IN - Actualizar amistad (solo status y updatedAt)
 */
export interface UpdateFriendshipData {
    userId: UserId;
    friendId: UserId;
    status: FriendshipStatus;
    updatedAt: Date;
}
/**
 * Estructura exacta de una row de SQLite (tabla friendship)
 * Con snake_case como está en la DB
 */
export interface FriendshipRow {
    user_id: string;
    friend_id: string;
    status: string;
    created_at: number;
    updated_at: number;
}
/**
 * Estructura limitada de SQLite para update de status (tabla friendship)
 * Con snake_case como está en la DB
 */
export interface UpdateFriendshipRow {
    user_id: string;
    friend_id: string;
    status: string;
    updated_at: number;
}
//# sourceMappingURL=friendship.types.d.ts.map
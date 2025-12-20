import { Static } from '@sinclair/typebox';
import { UserTypes } from './user.types.js';
import type { FriendshipStatus } from '../constants/friendship.constants.js';
import { FriendshipSchemas } from '../schemas/friendship.schema.js';

// ============================================================================
// ENTIDAD DE DOMINIO
// ============================================================================

/**
* Amistad entre dos usuarios
* Representa la relación y su estado actual
*/
export interface Friendship {
	userId: UserTypes.UserId;
	friendId: UserTypes.UserId;
	initiatorId: UserTypes.UserId;
	status: FriendshipStatus;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// DTOs - INPUT (Crear / Actualizar)
// ============================================================================

/**
* DTO IN - Crear amistad
* Enviada por el backend al crear relación
*/
export interface CreateFriendshipData {
	initiatorId: UserTypes.UserId;
	friendId: UserTypes.UserId;
	status: FriendshipStatus; // default 'pending'
}

/**
 * Body HTTP para crear una amistad (entrada API)
 */
export type CreateFriendshipBody = Static<typeof FriendshipSchemas.CreateFriendshipBody>;

/**
* DTO IN - Actualizar amistad
* Solo puede cambiar status y updatedAt
*/
export interface UpdateFriendshipData {
	userId: UserTypes.UserId;
	friendId: UserTypes.UserId;
	status: FriendshipStatus;
	updatedAt: Date;
}

// ============================================================================
// REPRESENTACIÓN SQL (Snake_case)
// ============================================================================

/**
* Row exacta de tabla 'friendships'
* Expresa keys snake_case con los tipos de la tabla
*/
export interface FriendshipRow {
	user_id: UserTypes.UserId;      // UserId (UUID)
	friend_id: UserTypes.UserId;    // UserId (UUID)
	initiator_id: UserTypes.UserId; // UserId (UUID)
	status: FriendshipStatus;       // FriendshipStatus
	created_at: number;   // Unix timestamp
	updated_at: number;   // Unix timestamp
}

/**
* Row limitada para update parcial
* Solo status y updated_at
*/
export interface UpdateFriendshipRow {
	user_id: UserTypes.UserId;      // UserId (UUID)
	friend_id: UserTypes.UserId;    // UserId (UUID)
	status: FriendshipStatus;       // FriendshipStatus
	updated_at: number;   // Unix timestamp
}

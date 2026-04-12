import { Static } from '@sinclair/typebox';
import { UserTypes } from './user.types.js';
import type { FriendshipStatus } from '../constants/friendship.constants.js';
import { FriendshipSchemas } from '../schemas/friendship.schema.js';

export namespace FriendshipTypes {

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
	 * Query opcional para listar amistades (filtra por status)
	 */
	export type ListFriendshipsQuery = Static<typeof FriendshipSchemas.ListFriendshipsQuery>;

	/**
	 * Respuesta HTTP para listar amistades del usuario autenticado
	 */
	export type ListFriendshipsResponse = Static<typeof FriendshipSchemas.ListFriendshipsSchema.response[200]>;

	/**
	 * Params HTTP para actualizar (aceptar/rechazar) una amistad pendiente
	 */
	export type UpdateFriendshipParams = Static<typeof FriendshipSchemas.UpdateFriendshipParams>;

	/**
	 * Params HTTP para identificar amistad a eliminar (param + id de user en JWT)
	 */
	export type DeleteFriendshipParams = Static<typeof FriendshipSchemas.DeleteFriendshipParams>;

	/**
	 * Params HTTP para cancelar una solicitud pendiente enviada
	 */
	export type CancelFriendshipParams = Static<typeof FriendshipSchemas.CancelFriendshipParams>;
	
	/**
	 * Body HTTP para actualizar (aceptar/rechazar) una amistad pendiente
	 */
	export type UpdateFriendshipBody = Static<typeof FriendshipSchemas.UpdateFriendshipBody>;

	/**
	 * Alias de compatibilidad mientras migran las capas superiores
	 */
	export type AcceptFriendshipParams = UpdateFriendshipParams;
	export type AcceptFriendshipBody = UpdateFriendshipBody;

	/**
	 * Status permitidos al decidir una solicitud pendiente (aceptada o rechazada)
	 */
	export type FriendshipDecisionStatus = Extract<FriendshipStatus, 'accepted' | 'rejected'>;

	/**
	* DTO IN - Actualizar amistad
	* Solo puede cambiar status y updatedAt
	*/
	export interface UpdateFriendshipData {
		userId: UserTypes.UserId;
		friendId: UserTypes.UserId;
		status: FriendshipDecisionStatus;
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
		status: FriendshipDecisionStatus;       // FriendshipStatus
		updated_at: number;   // Unix timestamp
	}
}

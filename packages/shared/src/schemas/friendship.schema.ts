import { Type } from '@sinclair/typebox';
import { FRIENDSHIP_STATUS } from '../constants/friendship.constants.js';
import { ErrorSchemas } from './error.schema.js';
import { SchemaFields } from './fields.schema.js';

const { UuidField } = SchemaFields;

export namespace FriendshipSchemas {

	// ============================================================================
	// ENUMS
	// ============================================================================

	// Enum explícito para que Swagger UI muestre todas las opciones
	export const FriendshipStatus = Type.String({
		enum: Object.values(FRIENDSHIP_STATUS),
		description: 'Estado de la amistad'
	});

	// ============================================================================
	// ENTIDAD
	// ============================================================================

	export const Friendship = Type.Object({
		initiatorId: UuidField,
		userId: UuidField,
		friendId: UuidField,
		status: FriendshipStatus,
		createdAt: Type.String({ format: 'date-time' }),
		updatedAt: Type.String({ format: 'date-time' })
	});

	// ============================================================================
	// DTOs / RUTAS
	// ============================================================================

	export const ListFriendshipsQuery = Type.Object({
		status: Type.Optional(
			Type.String({
				enum: Object.values(FRIENDSHIP_STATUS),
				description: 'Estado de la amistad',
				nullable: true
			})
		)
	});

	export const ListFriendshipsSchema = {
		description: 'Lista amistades del usuario autenticado (filtro opcional por estado)',
		tags: ['Friendship'],
		querystring: ListFriendshipsQuery,
		response: {
			200: Type.Object({ friendships: Type.Array(Friendship) })
		},
		security: [{ bearerAuth: [] }]
	};

	export const CreateFriendshipBody = Type.Object({
		friendId: UuidField
	});

	export const CreateFriendshipSchema = {
		description: 'Crea una solicitud de amistad con estado pendiente (initiatorId proviene del JWT)',
		tags: ['Friendship'],
		body: CreateFriendshipBody,
		response: {
			201: Friendship,
			401: ErrorSchemas.Unauthorized,
			404: ErrorSchemas.NotFound,
			409: ErrorSchemas.Conflict
		},
		security: [{ bearerAuth: [] }]
	};

	// PATCH /friendships/:friendId - Aceptar o rechazar amistad pendiente
	export const UpdateFriendshipParams = Type.Object({
		friendId: UuidField
	});

	export const UpdateFriendshipBody = Type.Object({
		accepted: Type.Boolean()
	});

	export const UpdateFriendshipSchema = {
		description: 'Actualiza el estado de una amistad pendiente (aceptar o rechazar)',
		tags: ['Friendship'],
		params: UpdateFriendshipParams,
		body: UpdateFriendshipBody,
		response: {
			200: Friendship,
			401: ErrorSchemas.Unauthorized,
			404: ErrorSchemas.NotFound,
			409: ErrorSchemas.Conflict
		},
		security: [{ bearerAuth: [] }]
	};

	export const DeleteFriendshipParams = Type.Object({
		friendId: UuidField
	});

	export const DeleteFriendshipSchema = {
		description: 'Elimina una amista activa entre el usuario autenticado y otro usuario',
		tags: ['Friendship'],
		params: DeleteFriendshipParams,
		response: {
			204: Type.Null(),
			401: ErrorSchemas.Unauthorized,
			404: ErrorSchemas.NotFound
		},
		security: [{ bearerAuth: [] }]
	}

	// Alias temporal para mantener compatibilidad con capas aún no migradas
	export const AcceptFriendshipParams = UpdateFriendshipParams;
	export const AcceptFriendshipBody = UpdateFriendshipBody;
	export const AcceptFriendshipSchema = UpdateFriendshipSchema;
}


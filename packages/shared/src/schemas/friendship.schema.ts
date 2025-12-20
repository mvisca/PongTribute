import { Type } from '@sinclair/typebox';
import { FRIENDSHIP_STATUS } from '../constants/friendship.constants.js';

const UuidField = Type.String({ format: 'uuid' });

export namespace FriendshipSchemas {

	// ============================================================================
	// ENUMS
	// ============================================================================

	export const FriendshipStatus = Type.Union([
		Type.Literal(FRIENDSHIP_STATUS.PENDING),
		Type.Literal(FRIENDSHIP_STATUS.ACCEPTED),
		Type.Literal(FRIENDSHIP_STATUS.REJECTED)
	]);

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

	export const CreateFriendshipBody = Type.Object({
		friendId: UuidField
	});

	export const CreateFriendshipSchema = {
		description: 'Crea una solicitud de amistad con estado pendiente (initiatorId proviene del JWT)',
		tags: ['Friendship'],
		body: CreateFriendshipBody,
		response: {
			201: Friendship
		},
		security: [{ bearerAuth: [] }]
	};
}


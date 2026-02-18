import { FriendshipTypes, UserTypes, FriendshipStatus } from '@transcendence/shared';

/**
 * @class FriendshipMapper
 *
 * Funciones puras para convertir entre representaciones del usuario:\
 * \
 * - **rowToUserPublic(row)** → Convierte una fila de SQLite en `UserPublic`. \
 * - **rowToUser(row)** → Convierte una fila de SQLite en `User` (incluye `passwordHash`). \
 * - **dataToInsert(data)** → Transforma un `User` del dominio en un objeto listo para `INSERT` SQL. \
 * - **dataToUpdate(data)** → Transforma un `UserUpdate` en un objeto parcial para `UPDATE` SQL.
 * \
 * Notas: \
 * - Usa `SharedTypes` del módulo `shared` para mantener tipos consistentes entre dominio y persistencia. \
 * - Convierte fechas (`createdAt`, `updatedAt`) a `Date` al leer y a `timestamp` numérico al escribir. \
 * - Los nombres de columnas en la base de datos siguen `snake_case`.
 * - Las queries se hacen con LOWER al igual que el envío de parámentros desde repository.
 */
export class FriendshipMapper {

	static rowToFriendshipResponse(row: FriendshipTypes.FriendshipRow): FriendshipTypes.Friendship {
		return {
			userId: row.user_id as UserTypes.UserId,
			initiatorId: row.initiator_id as UserTypes.UserId,
			friendId: row.friend_id as UserTypes.UserId,
			status: row.status as FriendshipStatus,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at)
		};
	}

	static dataToInsert(data: FriendshipTypes.Friendship) : FriendshipTypes.FriendshipRow {
		return {
			user_id: data.userId,
			initiator_id: data.initiatorId,
			friend_id: data.friendId,
			status: data.status,
			created_at: data.createdAt.getTime(),
			updated_at: data.updatedAt.getTime()
		};
	}

	static dataToSet(data: FriendshipTypes.UpdateFriendshipData) : FriendshipTypes.UpdateFriendshipRow {
		return {
			user_id: data.userId,
			friend_id: data.friendId,
			status: data.status,
			updated_at: data.updatedAt.getTime()
		}
	}
}

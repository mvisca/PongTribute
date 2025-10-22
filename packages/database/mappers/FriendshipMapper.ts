/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FriendshipMapper.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/21 17:53:32 by m                 #+#    #+#             */
/*   Updated: 2025/10/22 00:51:34 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as SharedTypes from '../../shared';

/**
 * @class FriendshipMapper
 * 
 * Funciones puras para convertir entre representaciones del usuario:\
 * \
 * - **rowToUserResponse(row)** → Convierte una fila de SQLite en `UserResponse`. \
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

	static rowToFriendshipResponse(row: SharedTypes.FriendshipRow): SharedTypes.Friendship {
		return {
			userId: row.user_id as SharedTypes.UserId,
			friendId: row.friend_id as SharedTypes.UserId,
			status: row.status as SharedTypes.FriendshipStatus,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at)
		};
	}

	static dataToInsert(data: SharedTypes.Friendship) : SharedTypes.FriendshipRow {
		return {
			user_id: data.userId,
			friend_id: data.friendId,
			status: data.status,
			created_at: data.createdAt.getTime(),
			updated_at: data.updatedAt.getTime()
		};
	}

	static dataToSet(data: SharedTypes.UpdateFriendshipData) : SharedTypes.UpdateFriendshipRow {
		return {
			user_id: data.userId,
			friend_id: data.friendId,
			status: data.status,
			updated_at: data.updatedAt.getTime()
		}
	}
}
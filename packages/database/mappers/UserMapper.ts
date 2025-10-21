/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserMapper.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 02:31:03 by m                 #+#    #+#             */
/*   Updated: 2025/10/21 14:15:14 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as SharedTypes from '../../shared';

/**
 * @class UserMapper
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
 */

export class UserMapper {

	static rowToUserResponse(row: any): SharedTypes.UserResponse {
		return {
			id: row.id as SharedTypes.UserId,
			username: row.username,
			email: row.email as SharedTypes.Email,
			avatar: row.avatar,
			isOnline: Boolean(row.is_online),
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at)
		};
	}

	static rowToUser(row: any): SharedTypes.User {
		return {
			...this.rowToUserResponse(row),
			passwordHash: row.password_hash
		};
	}

	static dataToInsert(data: SharedTypes.User) {
		const now = new Date(data.createdAt);
		return {
			id: data.id,
			username: data.username,
			email: data.email,
			password_hash: data.passwordHash, // se hashea en Módulo User
			avatar: data.avatar || null,
			is_online: data.isOnline ? 1 : 0,
			created_at: data.createdAt.getTime(), // crea timestamp Unix (en milisegundos) a partir de Date 
			updated_at: data.updatedAt.getTime()
		};
	}

	static dataToSet(data: SharedTypes.UserUpdate) {
		const update: any = {
			updated_at: Date.now()
		};

		if (data.username !== undefined) update.username = data.username;
		if (data.avatar !== undefined) update.avatar = data.avatar;
		if (data.email !== undefined) update.email = data.email;

		return update;
	}
}
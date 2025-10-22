/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserMapper.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 02:31:03 by m                 #+#    #+#             */
/*   Updated: 2025/10/22 20:38:34 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as SharedTypes from '@transcendence/shared';

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
		const update: any = {};
		
		if (data.username !== undefined) update.username = data.username;
		if (data.avatar !== undefined) update.avatar = data.avatar;
		if (data.email !== undefined) update.email = data.email;
		
		return update;
	}

	/**
	* Metodos de validacion
	*/

	/**
	* Limpia y valida datos para update
	* @throws erros si hay datos invalidos
	*/
	static validateUpdate(data: unknown): SharedTypes.UserUpdate {
		if (!data || typeof data !== 'object')
			throw new Error('Invalid update data');

		// Aserción de tipo con todas las propiedades opcionales
		// Afecta tratamiento de ts, no el objeto
		const allowed = data as Partial<SharedTypes.UserUpdate>; 

		const validated: SharedTypes.UserUpdate = {};

		// Lista blanca tupla literal
		const allowedFields = ['email', 'username', 'avatar'] as const;
		
		// Extrae claves
		const providedFields = Object.keys(allowed); 
		// Si allowed = { email: 'a@a.a', role: 'aaa'}
		// Entonces providedFields = ['email', 'role']

		// Rechazar no permitidos ['role']
		const invalidFields = providedFields.filter(
			field => !allowedFields.includes(field as any)
		);
		// invalidFields = ['role']

		// Termina si hay campos inválidos, continúa si los campos son válidos
		if (invalidFields.length > 0) {
			throw new Error(`Invlid fields ${invalidFields.join(' ')}`);
		}

		// Validar email
		if (allowed.email !== undefined) {
			if (typeof allowed.email !== 'string' || allowed.email.trim() == '') {
				throw new Error('Email must be non-empty string');
			}

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(allowed.email)) {
				throw new Error('Invalid email format');
			}

			validated.email = allowed.email.trim().toLowerCase() as SharedTypes.Email;

			// Validar username
			if (allowed.username !== undefined) {
				if (typeof allowed.username !== 'string' || allowed.username.trim() === ''){
					throw new Error('Username must be non empty string');
				}
				if (allowed.username?.length < 3 || allowed.username?.length > 20) {
					throw new Error('Username must be beteen 3 and 20 characters');
				}
				validated.username = allowed.username.trim();
			}
		}

		// Validar avatar
		if (allowed.avatar !== undefined) {
			if (typeof allowed.avatar !== 'string' || allowed.avatar.trim() === '') {
				throw new Error('Avatar must be a non-empty string');
			}
			try {
				new URL(allowed.avatar);
				validated.avatar = allowed.avatar.trim();
			} catch {
				throw new Error('Avatar must ve a valid URL');
			}
		}

		// Rechazar objeto vacío
		if (Object.keys(validated).length === 0) {
			throw new Error('No valid fields to update');
		}
		return validated;			
	}

		/**
	 * Valida que:
	 * current y new existan
	 * current !== new
	 * New password tenga al menos 8 char
	 */
	static validatePasswordUpdate(data: unknown) {
		// Objeto válido
		if (data  || typeof data !== 'object') {
			throw new Error('Invalid password data');
		}

		const input = data as Record<string, unknown>;

		// Verifica currentPassword existe y es string
		if (!input.currentPassword || typeof input.currentPassword !== 'string') {
			throw new Error('Current password is required');
		}

		if (!input.newPassword || typeof input.newPassword !== 'string') {
			throw new Error('New password is required');
		}
		
		if (input.newPassword.length < 8) {
			throw new Error('New password must have at least 8 characters');
		}

		if (input.newPassword === input.currentPassword) {
			throw new Error('New password must be different from current password');
		}

		return {
			currentPassword: input.currentPassword,
			newPassword: input.newPassword
		}
	}
// Fin clase
}
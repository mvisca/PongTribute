/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SQLiteUserRepository.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 12:17:05 by m                 #+#    #+#             */
/*   Updated: 2025/10/21 14:55:29 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Se usará aquí el branded type UserId \
 * Pero ya se importó en 'user.types.ts' \
 * Por no ser redundante lo omitimos \
 * import { UserId } from "../../types/branded.types"; \ 
 */
import Database from 'better-sqlite3';
import { IUserRepository } from './IUserRepository';
import { UserMapper } from '../mappers/UserMapper';
import { Email, UserId } from '../../shared/types/branded.types';
import * as UserTypes from '../../shared/types/user.types';
import { generateUserId } from '../../shared/utils/uuidGenerator';

export class SQLiteUserRepository implements IUserRepository {
	
	constructor(private db: Database.Database) {}
	
	private getRowUserById(id: UserId): any {
		// Se puede hacer en una línea pero lo divido para comprensión paso a paso
		// return this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);

		// Crear linea de comandos SQL para recuperar el nuevo usuario
		const inserted = this.db.prepare(`SELECT * FROM users WHERE id = ?`);

		// Ejecuta línea de comandos SQL para recuperar el nuevo usuario
		const selectedUser = inserted.get(id);

		// Retornar el usuario seleccionado
		return selectedUser;
	}

	async create(data: UserTypes.CreateUserData): Promise<UserTypes.UserResponse> {
		// Crear el objeto completo agregando lo que falta
		const now = new Date();
		const newUser: UserTypes.User = {
			id: generateUserId(),
			...data,
			isOnline: false, // será true al generar token (AuthService), se crea false
			createdAt: now,
			updatedAt: now
		};
		
		// Mapper para traducir objeto a fila de base de datos
		const row = UserMapper.dataToInsert(newUser);
		
		// Crea el linea de comandos SQL
		const toInsert = this.db.prepare(`
			INSERT INTO users (
				id, username, email, password_hash,
				avatar, is_online, created_at, updated_at
				)
				VALUES (
					@id, LOWER(@username), LOWER(@email), @password_hash,
					@avatar, @is_online, @created_at, @updated_at
			)
		`);
		
		// Ejecuta la línea de comandos SQL
		toInsert.run(row);
		
		// Retorna el user recien creado mapeado al tipo UserResponse
		return UserMapper.rowToUserResponse(this.getRowUserById(row.id));
	}

	async update(id: UserId, data: UserTypes.UserUpdate): Promise<UserTypes.UserResponse> {
		// Como puede ser que no todos los parametros esten en data, hay que extraer los key presentes
		// Primero se convierte el type UserUpdate a row, el mapper filtra campos no presentes
		// Generar un objeto anónimo, sin tipo
		const updateData = UserMapper.dataToSet(data);

		const finalData = {
			...updateData,
			updated_at: Date.now()
		};

		// Genera un string en formato ok para SET de SQL "username = @username, ..." solo con keys presentes
		const fields = Object.keys(finalData)
			.map(key => `${key} = @${key}`)
			.join(', ');

		// Actualiza expandiendo 'fields' y pasando a 'run()' el objeto anónimo con key: value, y la id del target de users
		this.db
			.prepare(`UPDATE users SET ${fields} WHERE id = @id `)
			.run( { ...finalData, id } );

		// Retorna el record modificado mapeado al tipo UserResponse
		return UserMapper.rowToUserResponse(this.getRowUserById(id));
	}

	async updatePassword(id: UserId, password_hash: string): Promise<UserTypes.UserResponse> {
		const targetUser = this.db.prepare(`
			UPDATE users
			SET password_hash = @password_hash, updated_at = @now
			WHERE id = @id
		`).run({
			password_hash: password_hash,
			now: Date.now(),
			id: id
		});

		// Retorna el record del password actualizado mapeado al tipo UserResponse
		return UserMapper.rowToUserResponse(this.getRowUserById(id));
	}

	async delete(id: UserId): Promise<void> {
		this.db.prepare(`
			DELETE FROM users
			WHERE id = ?
		`).run(id);
	}

	async findById(id: UserId): Promise<UserTypes.UserResponse | null> {
		const row = this.getRowUserById(id);
		return row ? UserMapper.rowToUserResponse(row) :null;
	}

	async findByEmail(email: Email): Promise<UserTypes.User | null> {
		const row = this.db
			.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`)
			.get(email.toLowerCase());
		return row ? UserMapper.rowToUser(row) : null;
	}

	async findByUsername(username: string): Promise<UserTypes.User | null> {
		const row = this.db
				.prepare(`SELECT * FROM users WHERE LOWER(username) = ?`)
				.get(username.toLowerCase());
		return row ? UserMapper.rowToUser(row) : null;
	}

	async isUsernameTaken(username: string): Promise<boolean> {
		const user = this.db
			.prepare(`SELECT * FROM users WHERE LOWER(username) = ?`)
			.get(username.toLowerCase());
		return !!user;
	}

	async isEmailTaken(email: Email): Promise<boolean> {
		const user = this.db
			.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`)
			.get(email.toLowerCase());
		return !!user; // Equivale a 'return user !== null && user !== undefined;'
	}

	async setOnlineStatus(id: UserId, isOnline: boolean): Promise<UserTypes.UserResponse> {
		this.db
			.prepare(`UPDATE users
				SET is_online = @is_online, updated_at = @updated_at
				WHERE id = @id`)
			.run({is_online: isOnline ? 1 : 0, updated_at: Date.now(), id: id});

		// Recupera el usuario recién actualizado
		const targetUser = this.getRowUserById(id);

		// Retorna el usuario sin 'password_hash'
		return UserMapper.rowToUserResponse(targetUser);
	}
}
import BetterSqlite3 from "better-sqlite3";
import { UserTypes, FriendshipTypes, FriendshipStatus, SharedErrors, FRIENDSHIP_STATUS } from '@transcendence/shared';
import { IFriendshipRepository } from './IFriendshipRepository.js';
import { FriendshipMapper } from '../mappers/FriendshipMapper.js';   
import { getDatabase } from '../index.js';

type UserId = UserTypes.UserId;

export class SQLiteFriendshipRepository implements IFriendshipRepository {

	constructor(private db: BetterSqlite3.Database = getDatabase()) {}

	// =========================================================================
	// MÉTODOS PRIVADOS
	// =========================================================================
	
	/**
	 * Busca una amistad entre dos usuarios,\
	 * sin importar el orden en que se insertaron.
	 */
	private getRowFriendsByIds(userId: UserId, friendId: UserId): any {
		return this.db.prepare(`
			SELECT * FROM friendships 
			WHERE (user_id = @user_id AND friend_id = @friend_id)
			OR (user_id = @friend_id AND friend_id = @user_id)
		`).get({ user_id: userId, friend_id: friendId });
	}

	/**
	 * Ordena los IDs alfabéticamente para mantener\
	 * consistencia en el almacenamiento y evitar duplicados.\
	 * Estilo canónico.
	 */
	private sortIds(userId: UserId, friendId: UserId): UserId[] {
		return userId < friendId
			? [userId, friendId]
			: [friendId, userId];
	}

	/**
	 * Prepara los datos antes de insertar:\
	 * - Ordena los IDs.\
	 * - Añade timestamps.
	 */
	private prepareData(data: FriendshipTypes.CreateFriendshipData): FriendshipTypes.Friendship {
		const now = new Date();
		const [userId, friendId] = this.sortIds(data.initiatorId, data.friendId);
		return {
			userId,
			friendId,
			initiatorId: data.initiatorId,
			status: data.status,
			createdAt: now,
			updatedAt: now
		};
	}
	
	// =========================================================================
	// MÉTODOS PÚBLICOS
	// =========================================================================
	
	/**
	 * Crea una nueva amistad entre dos usuarios.\
	 * Devuelve el registro insertado como `Friendship`.
	 */
	async create(
		data: FriendshipTypes.CreateFriendshipData
	): Promise<FriendshipTypes.Friendship> {

		const newFriendship = this.prepareData(data);
		const row = FriendshipMapper.dataToInsert(newFriendship);

		this.db.prepare(`
			INSERT INTO friendships (user_id, friend_id, initiator_id, status, created_at, updated_at)
			VALUES (@user_id, @friend_id, @initiator_id, @status, @created_at, @updated_at)
		`).run(row);

		return FriendshipMapper.rowToFriendshipResponse(
			this.getRowFriendsByIds(row.user_id as UserId, row.friend_id as UserId)
		);
	}

	/**
	 * Actualiza el estado de una amistad existente.\
	 * Retorna el registro actualizado.
	 */
	async update(
		data: FriendshipTypes.UpdateFriendshipData
	): Promise<FriendshipTypes.Friendship> {

		const [userId, friendId] = this.sortIds(data.userId, data.friendId);

		const existingRow = this.getRowFriendsByIds(userId, friendId);
		if (!existingRow)
			throw new SharedErrors.NotFoundError(
				`Friendship not found between ${userId} and ${friendId}`,
				'friendship'
			);

		if (existingRow.status !== FRIENDSHIP_STATUS.PENDING)
			throw new SharedErrors.ConflictError('La amistad no está pendiente', 'friendship');

		const updateData = FriendshipMapper.dataToSet({
			...data,
			userId,
			friendId
		});

		const result = this.db.prepare(`
			UPDATE friendships
			SET status = @status, updated_at = @updated_at 
			WHERE (user_id = @user_id AND friend_id = @friend_id)
		`).run(updateData);

		if (result.changes === 0)
			throw new SharedErrors.NotFoundError(
				`No se pudo actualizar la amistad entre ${userId} y ${friendId}`,
				'friendship'
			);

		const updatedRow = this.getRowFriendsByIds(userId, friendId);

		if (!updatedRow)
			throw new Error(`No se ha podido recuperar la amistad actualizada para ${userId} y ${friendId}`);

		return FriendshipMapper.rowToFriendshipResponse(updatedRow);
	}

	/**
	 * Elimina amistad entre dos usuarios.
	 */
	async delete(userId: UserId, friendId: UserId): Promise<void> {
		const [userId2, friendId2] = this.sortIds(userId, friendId);
		this.db.prepare(`
			DELETE FROM friendships
			WHERE user_id = ? AND friend_id = ?
		`).run(userId2, friendId2);
	}

	/**
	 * Busca una relación específica entre dos usuarios.\
	 * Retorna `null` si no existe.
	 */
	async findByUserAndFriend(
		userId: UserId, friendId: UserId
	): Promise<FriendshipTypes.Friendship | null> {
		const row = this.getRowFriendsByIds(userId, friendId);
		return row ? FriendshipMapper.rowToFriendshipResponse(row) : null;
	}

	/**
	 * Busca todas las relaciones de amistad de un usuario\
	 * (tanto enviadas como recibidas).
	 */
	async findByUser(userId: UserId): Promise<FriendshipTypes.Friendship[]> {
		const rows = this.db.prepare(`
			SELECT * FROM friendships
			WHERE user_id = ? OR friend_id = ?
		`).all(userId, userId);

		return rows.map(row =>
			FriendshipMapper.rowToFriendshipResponse(row as FriendshipTypes.FriendshipRow)
		);
	}

	/**
	 * Busca todas las relaciones de amistad de un usuario\
	 * filtradas por estado (pending o accepted).
	 */
	async findByUserAndStatus(
		userId: UserId, status: FriendshipStatus
	): Promise<FriendshipTypes.Friendship[]> {
		const rows = this.db.prepare(`
			SELECT * FROM friendships
			WHERE (user_id = ? OR friend_id = ?)
			AND (status = ?)
		`).all(userId, userId, status);

		return rows.map(row =>
			FriendshipMapper.rowToFriendshipResponse(row as FriendshipTypes.FriendshipRow)
		);
	}

	/**
	 * Elimina friendships con status 'rejected' o 'pending'
	 * cuyo updated_at supere maxAgeDays días.
	 */
	async cleanStale(maxAgeDays: number): Promise<number> {
		const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
			.toISOString();

		const result = this.db.prepare(`
			DELETE FROM friendships
			WHERE status IN (?, ?)
			AND updated_at < ?
		`).run(FRIENDSHIP_STATUS.REJECTED, FRIENDSHIP_STATUS.PENDING, cutoff);

		return result.changes;
	}
}
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SQLiteFriendshipRepository.ts                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 12:17:05 by m                 #+#    #+#             */
/*   Updated: 2025/10/22 20:40:26 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Database from 'better-sqlite3';
import { UserId, FriendshipStatus } from '@transcendence/shared';
import * as FriendshipTypes from '@transcendence/shared';
import { IFriendshipRepository } from './IFriendshipRepository';      // ← Local
import { FriendshipMapper } from '../mappers/FriendshipMapper';   

export class SQLiteFriendshipRepository implements IFriendshipRepository {

	constructor(private db: Database.Database) {}

	private getRowFriendsByIds(userId: UserId, friendId: UserId): any {
		return this.db.prepare(`
			SELECT * FROM friendships 
			WHERE (user_id = @user_id AND friend_id = @friend_id)
			OR (user_id = @friend_id AND friend_id = @user_id)
		`).get({ user_id: userId, friend_id: friendId });
	}

	private sortIds(userId: UserId, friendId: UserId): UserId[] {
		return userId < friendId
			? [userId, friendId]
			: [friendId, userId];
	}

	private prepareData(data: FriendshipTypes.CreateFriendshipData): FriendshipTypes.Friendship {
		const now = new Date();
		const [userId, friendId] = this.sortIds(data.userId, data.friendId);
		return {
			userId,
			friendId,
			status: data.status,
			createdAt: now,
			updatedAt: now
		};
	}
	
	async create(
		data: FriendshipTypes.CreateFriendshipData
	): Promise<FriendshipTypes.Friendship> {

		const newFriendship: FriendshipTypes.Friendship = this.prepareData(data);
		const row = FriendshipMapper.dataToInsert(newFriendship);

		this.db
			.prepare(`
				INSERT INTO friendships (user_id, friend_id, status, created_at, updated_at)
				VALUES (@user_id, @friend_id, @status, @created_at, @updated_at)`)
			.run(row);

		return FriendshipMapper.rowToFriendshipResponse(
			this.getRowFriendsByIds(row.user_id as UserId, row.friend_id as UserId)
		);
	}

	async update(
		data: FriendshipTypes.UpdateFriendshipData
	): Promise<FriendshipTypes.Friendship> {

		const [userId, friendId] = this.sortIds(data.userId, data.friendId);
		const sortedData = {
			...data,
			userId,
			friendId
		};
		const updateData = FriendshipMapper.dataToSet(sortedData);

		this.db
			.prepare(`
				UPDATE friendships
				SET status = @status, updated_at = @updated_at 
				WHERE (user_id = @user_id AND friend_id = @friend_id)
			`)
			.run( { ...updateData} );

		return FriendshipMapper.rowToFriendshipResponse(
			this.getRowFriendsByIds(data.userId, data.friendId));
	}

	async delete(userId: UserId, friendId: UserId): Promise<void> {

		const [userId2, friendId2] = this.sortIds(userId, friendId);
		
		this.db.prepare(`
			DELETE FROM friendships
			WHERE user_id = ? AND friend_id = ?
		`).run(userId2, friendId2);
	}

	async findByUserAndFriend(
		userId: UserId, friendId: UserId
	): Promise<FriendshipTypes.Friendship | null> {
		const row = this.getRowFriendsByIds(userId, friendId);
		return row ? FriendshipMapper.rowToFriendshipResponse(row) : null;
	}

	async findByUser(userId: UserId): Promise<FriendshipTypes.Friendship[]> {
		const rows = this.db
			.prepare(`
				SELECT * FROM friendships
				WHERE user_id = ? OR friend_id = ?
			`)
			.all(userId, userId);
		return rows.map(
			row => FriendshipMapper
			.rowToFriendshipResponse(row as FriendshipTypes.FriendshipRow));
	}

	async findByUserAndStatus(
		userId: UserId, status: FriendshipStatus
	): Promise<FriendshipTypes.Friendship[]> {
		const rows = this.db
			.prepare(`
				SELECT * FROM friendships
				WHERE (user_id = ? OR friend_id = ?)
				AND (status = ?)
				`)
			.all(userId, userId, status);
		return rows.map(
			row => FriendshipMapper
			.rowToFriendshipResponse(row as FriendshipTypes.FriendshipRow)
		);
	}
}
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   friendship.types.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/21 16:06:08 by m                 #+#    #+#             */
/*   Updated: 2025/10/22 00:17:27 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { UserId } from './branded.types';
import type { FriendshipStatus } from '../constants/friendship.constants';

/**
 * Entidad completa para BD
 */
export interface Friendship {
	userId: UserId;
	friendId: UserId;
	status: FriendshipStatus;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * DTO IN - Crear amistad
 */
export interface CreateFriendshipData {
	userId: UserId;
	friendId: UserId;
	status: FriendshipStatus; // default 'pending'
	
}

/**
 * DTO IN - Actualizar amistad (solo status y updatedAt)
 */
export interface UpdateFriendshipData {
	userId: UserId;
	friendId: UserId;
	status: FriendshipStatus;
	updatedAt: Date;
}

/**
 * Estructura exacta de una row de SQLite (tabla friendship)
 * Con snake_case como está en la DB
 */
export interface FriendshipRow {
	user_id: string;
	friend_id: string;
	status: string;
	created_at: number;
	updated_at: number;
}

/**
 * Estructura limitada de SQLite para update de status (tabla friendship)
 * Con snake_case como está en la DB
 */
export interface UpdateFriendshipRow {
	user_id: string;
	friend_id: string;
	status: string;
	updated_at: number;
}
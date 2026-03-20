import { apiRequestWithRefresh } from "../../../core/api/apiInterceptor";
import type { FriendshipTypes } from "@transcendence/shared/types/friendship.types.js";
import type { UserTypes } from '@transcendence/shared/types/user.types.js';

export async function getFriendships(token: string, status?: string) {
	const query = status ? `?status=${status}` : '';
	return await apiRequestWithRefresh<{ friendships: FriendshipTypes.Friendship[] }>(`/friendships${query}`, {
		method: 'GET',
		token
	});
}

export async function sendFriendRequest(friendId: string, token: string) {
	return await apiRequestWithRefresh<FriendshipTypes.Friendship>(`/friendships`, {
		method: 'POST',
		body: { friendId },
		token,
	});
}

export async function respondFriendRequest(friendId: string, accepted: boolean, token: string) {
	return await apiRequestWithRefresh<FriendshipTypes.Friendship>(`/friendships/${friendId}`, {
		method: 'PATCH',
		body: { accepted },
		token
	});
}

export async function removeFriend(friendId: string, token: string) {
	return await apiRequestWithRefresh<void>(`/friendships/${friendId}`, {
		method: 'DELETE',
		token,
	});
}

export async function findUserByUsername(username: string, token: string) {
	return await apiRequestWithRefresh<UserTypes.UserPublic>(`/users/username/${username}`, {
		token
	});
}
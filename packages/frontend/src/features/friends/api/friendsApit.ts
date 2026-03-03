import { apiRequest } from "../../../core/api/client";
import type { FriendshipTypes } from "@transcendence/shared/types/friendship.types.js";

export async function getFriendships(token: string, status?: string) {
	const query = status ? `?status=${status}` : '';
	return await apiRequest<FriendshipTypes.ListFriendshipsResponse>(`/friendships${query}`, { token });
}

export async function sendFriendshipRequest(friendId: string, accepted: boolean, token: string) {
	return await apiRequest<FriendshipTypes.Friendship>(`/friendship/${friendId}`, {
		method: 'POST',
		body: { friendId },
		token,
	});
}

export async function respondFriendRequest(friendId: string, accepted: boolean, token: string) {
	return await apiRequest<FriendshipTypes.Friendship>(`/friendship/${friendId}`, {
		method: 'PATCH',
		body: { accepted },
		token
	});
}

export async function removeFriend(friendId: string, token: string) {
	return await apiRequest<void>(`/friendship/${friendId}`, {
		method: 'DELETE',
		token,
	});
}
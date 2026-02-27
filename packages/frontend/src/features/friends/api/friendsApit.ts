import { FormEncType } from "react-router-dom";
import { apiRequest } from "../../../core/api/client";
import type { FriendshipTypes } from "@transcendence/shared";

export function getFriendships(token: string, status?: string) {
	const query = status ? `?status=${status}` : '';
	return apiRequest<FriendshipTypes.ListFriendshipsResponse>(`/api/friendships${query}`, { token });
}

export function sendFriendshipRequest(friendId: string, accepted: boolean, token: string) {
	return apiRequest<FriendshipTypes.Friendship>(`/api/friendship/${friendId}`, {
		method: 'POST',
		body: { friendId },
		token,
	});
}

export function respondFriendRequest(friendId: string, accepted: boolean, token: string) {
	return apiRequest<FriendshipTypes.Friendship>(`/api/friendship/${friendId}`, {
		method: 'PATCH',
		body: { accepted },
		token
	});
}

export function removeFriend(friendId: string, token: string) {
	return apiRequest<void>(`/api/friendship/${friendId}`, {
		method: 'DELETE',
		token,
	});
}
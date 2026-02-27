import { useTransition } from "react"
import { apiRequest } from "../../../core/api/client"
import type { UserTypes } from "@transcendence/shared"

export function getProfile(userId: string, token: string) {
	return apiRequest<UserTypes.UserPublic>(`/api/users/${userId}`, { token });
}

export function updateProfile(userId: string, body: UserTypes.UpdateUserBody, token: string) {
	return apiRequest<UserTypes.UserPublic>(`/api/users/${userId}`, {
		method: 'PUT',
		body,
		token,
	});
}
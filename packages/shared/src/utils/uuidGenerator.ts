import { randomUUID } from "crypto";

export function userId(): string {
	return randomUUID();
}

export function matchId(): string {
	return randomUUID();
}

export function eventId(): string {
	return randomUUID();
}

export function tokenId(): string {
	return randomUUID();
}
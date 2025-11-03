import { randomUUID } from "crypto";

export function generateUserId(): string {
	return randomUUID();
}

export function generateMatchId(): string {
	return randomUUID();
}

export function generateEventId(): string {
	return randomUUID();
}
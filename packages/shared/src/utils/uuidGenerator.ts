import { randomUUID } from "crypto";

export function UserId(): string {
	return randomUUID();
}

export function MatchId(): string {
	return randomUUID();
}

export function EventId(): string {
	return randomUUID();
}
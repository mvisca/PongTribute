/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   uuidGenerator.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mvisca-g <mvisca-g@student.42barcelona.com>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 01:47:26 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 12:10:34 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { EventId, UserId, MatchId, GameId } from  "../types/branded.types"; 
import { v4 as uuidv4 } from "uuid";

/**
 * Genera un UUID v4 compatible con Node.js y navegadores.
 * 
 * Usa crypto.randomUUID() si está disponible (Node 19+, todos los navegadores modernos),
 * de lo contrario usa una implementación de uuid.
 */

function generateId(): string {
	const g = globalThis as any;
	if (g?.crypto?.randomUUID) {
		return g.crypto.randomUUID() as string;
	}
	return uuidv4();
}

export function generateUserId(): UserId {
	return generateId() as UserId;
}

export function generateEventId(): EventId {
	return generateId() as EventId;
}

export function generateMatchId(): MatchId {
	return generateId() as MatchId;
}

export function generateGameId(): GameId {
	return generateId() as GameId;
}
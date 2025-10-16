/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   matchmaking.types.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 13:05:28 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 13:05:30 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { GameTitle, CourtType, Position, PlayerSlot } from "./game.types";
import { UserId, MatchId } from "../types/branded.types";

// ==== INTERFACES ====

export interface MatchFoundEvent {
	eventType: "match.found";
	matchId: string;
	gameTitle: GameTitle;
	courtType: CourtType;
	timestamp: number;
	expiresAt: number; // tiempo límite para confirmar.
	
	opponente: {
		id: UserId;
		alias: string;
		avatar?: string;
	};
	
	availablePositions: Position[];
}

export interface MatchConfirmedEvent {
	eventType: "match.confirmed";
	matchId: MatchId;
	gameTitle: GameTitle;
	courtType: CourtType;
	timestamp: number;

	players: Record<PlayerSlot, { userId: UserID; position: Position }> // usar type UserId
}


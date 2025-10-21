/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   matchmaking.types.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 21:09:38 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* import { UserId, MatchId } from "./branded.types";
import { GameTitle, CourtType, Position, PlayerSlot } from "./game.types";

export interface MatchFoundEvent {
  eventType: "match.found";
  matchId: MatchId;
  gameTitle: GameTitle;
  courtType: CourtType;
  timestamp: number;
  expiresAt: number;
  opponent: {
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
  players: Record<PlayerSlot, { userId: UserId; position: Position }>;
} */
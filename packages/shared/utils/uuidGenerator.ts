/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   uuidGenerator.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 02:59:13 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { randomUUID } from "crypto";
import * as SharedTypes from "..";

export function generateEventId(): SharedTypes.EventId {
	return randomUUID() as SharedTypes.EventId;
}

export function generateUserId(): SharedTypes.UserId {
	return randomUUID() as SharedTypes.UserId;
}

export function generateMatchId(): SharedTypes.MatchId {
	return randomUUID() as SharedTypes.MatchId;
}

export function generateGameId(): SharedTypes.GameId {
	return randomUUID() as SharedTypes.GameId;
}

export function generateTournamentId(): SharedTypes.TournamentId {
	return randomUUID() as SharedTypes.TournamentId;
}
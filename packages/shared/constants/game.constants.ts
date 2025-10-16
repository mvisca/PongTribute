/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.constants.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 13:05:01 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 13:05:12 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export const GAME_CONSTANTS = {
	COURT: {
		ASPECT_RATIO_2: 16/9,
		ASPECT_RATIO_4: 1/1,
		ASPECT_RATIO_6: 6/6,
	},
	
	PADDLE: {
		WIDTH_PERCENT: 0.1,
		HEIGHT_PERCENT: 0.15,
		SPEED: 0.015, // a 60 FPS
	},

	BALL: {
		SIZE: 0.02,
		INITIAL_SPEED: 0.008,
		MAX_SPEED: 0.025,
		ACCELERATION: 1.05,
	},
	
	COUNTDOWN: {
		INITIAL: 3,
		RECONNECT: 1,
	},

	SCORE: {
		WINNING_SCORE: 5, // El primero en hacer 5 goles gana
	},
} as const;

export type GameConstants = typeof GAME_CONSTANTS;
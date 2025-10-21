/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.constants.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 01:39:46 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export const GAME_CONSTANTS = {
  COURT_WIDTH: 800,
  COURT_HEIGHT: 600,
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 100,
  BALL_SIZE: 10,
  BALL_SPEED: 5,
  FPS: 60,
  COUNTDOWN_SECONDS: 3
} as const;
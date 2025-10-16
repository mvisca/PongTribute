/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   network.constants.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 13:05:19 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 13:05:22 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export const NETWORK_CONSTANTS = {
	NETWORK: {
		TICK_RATE: 60, // 60 updates por segundo
		RECONNECT_TIMEOUT: 3000, // 30 segundo
		MATCH_CONFIRM_TIMEOUT: 3000,
	}
} as const;

export type GameConstants = typeof NETWORK_CONSTANTS;
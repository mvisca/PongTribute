/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   friendship.constants.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/21 16:29:43 by m                 #+#    #+#             */
/*   Updated: 2025/10/22 02:29:33 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export const FRIENDSHIP_STATUS = {
	PENDING: 'pending',
	ACCEPTED: 'accepted'
} as const;

export type FriendshipStatus = typeof FRIENDSHIP_STATUS[keyof typeof FRIENDSHIP_STATUS];
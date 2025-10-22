/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   branded.types.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/22 01:50:20 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

 /**
  * Tipos branded para IDs únicos.
  */
export type EventId = string & { readonly __brand: 'EventId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type MatchId = string & { readonly __brand: 'MatchId' };
export type GameId = string & { readonly __brand: 'GameId' };
export type TournamentId = string & { readonly __brand: 'TournamentId' };
export type Email = string & { readonly __brand: 'Email' };
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   branded.types.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 12:01:23 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 13:04:29 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Tipos branded para IDs únicos.
 * 
 * Los branded types previenen mezclar diferentes tipos de IDs
 * a nivel de TypeScript sin overhead en runtime.
 * 
 * @example
 * ```typescript
 * const userId: UserId = "abc-123" as UserId; // ✅
 * const eventId: EventId = "def-456" as EventId; // ✅
 * 
 * function takeUser(id: UserId) { ... }
 * takeUser(eventId); // ❌ Error en compilación
 * ```
 */

/**
 * Id de Event
 */
export type EventId = string & { readonly __brand: 'EventId' };

/** 
 * Id de User
*/
export type UserId = string & { readonly __brand: 'UserId' };

/** 
 * Id de Match
*/
export type MatchId = string & { readonly __brand: 'MatchId' };

/**
 * Id de Game
 */
export type GameId = string & { readonly __brand: 'GameId' };
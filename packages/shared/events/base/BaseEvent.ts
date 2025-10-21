/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BaseEvent.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 19:27:04 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { generateEventId } from "../../utils/uuidGenerator";
import { EventId } from "../../types/branded.types";

export abstract class BaseEvent {
  public readonly id: EventId;
  public readonly eventType: string;
  public readonly timestamp: number;
  public readonly version: number;
  public readonly source: string;
  
  constructor(eventType: string, source: string) {
    this.id = generateEventId();
    this.eventType = eventType;
    this.timestamp = Date.now();
    this.version = 1;
    this.source = source;
  }

  abstract toJSON(): object;

  toString(): string {
    return `[${this.source}] ${this.eventType} (${this.id})`;
  }
}
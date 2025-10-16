/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BaseEvent.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 13:04:51 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 14:22:38 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { EventId } from "../../types/branded.types";
import { generateEventId } from "../../utils/uuidGenerator";

export abstract class BaseEvent {
	public readonly id: EventId;
	public readonly eventType: string; // crear un enum de types
	public readonly timestamp: number;
	public readonly version: number; // como lo administramos
	public readonly source: string; // quién lo emitió, podría ser un enum de sources
	
	constructor(eventType: string, source: string) {
		this.id = generateEventId();
		this.eventType = eventType;
		this.timestamp = Date.now();
		this.version = 1;
		this.source = source;
	}

	/** Método para serializar con validación:
	 * Define qué datos se enviarán por websocket en cada evento.
	 * Cada evento hijo debe implmentarlo porque tienen objetos distintos. */
	abstract toJSON(): object;

	/** Método para loggin para todos los eventos
	 * Se podría integrar en un sistema de loggin más amplio para todo el sistema
	 * O desarrollar otro sistema para debuguar que sea accesible por todo el sistema */
	toString(): string {
		return `[${this.source}] ${this.eventType} (${this.id})`;
	}	
}
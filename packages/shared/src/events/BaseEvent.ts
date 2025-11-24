import { Utils } from "../index.js";

export abstract class BaseEvent {
	public readonly id: string;
	public readonly eventType: string;
	public readonly timestamp: number;
	public readonly version: number;
	public readonly source: string;
	
	constructor(eventType: string, source: string) {
		this.id = Utils.generateEventId();
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
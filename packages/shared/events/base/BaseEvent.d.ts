import { EventId } from "../../types/branded.types";
export declare abstract class BaseEvent {
    readonly id: EventId;
    readonly eventType: string;
    readonly timestamp: number;
    readonly version: number;
    readonly source: string;
    constructor(eventType: string, source: string);
    abstract toJSON(): object;
    toString(): string;
}
//# sourceMappingURL=BaseEvent.d.ts.map
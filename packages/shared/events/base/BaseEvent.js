"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEvent = void 0;
const uuidGenerator_1 = require("../../utils/uuidGenerator");
class BaseEvent {
    id;
    eventType;
    timestamp;
    version;
    source;
    constructor(eventType, source) {
        this.id = (0, uuidGenerator_1.generateEventId)();
        this.eventType = eventType;
        this.timestamp = Date.now();
        this.version = 1;
        this.source = source;
    }
    toString() {
        return `[${this.source}] ${this.eventType} (${this.id})`;
    }
}
exports.BaseEvent = BaseEvent;
//# sourceMappingURL=BaseEvent.js.map
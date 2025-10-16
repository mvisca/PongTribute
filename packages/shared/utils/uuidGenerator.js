"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   uuidGenerator.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mvisca-g <mvisca-g@student.42barcelona.com>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 01:47:26 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 12:10:34 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUserId = generateUserId;
exports.generateEventId = generateEventId;
exports.generateMatchId = generateMatchId;
exports.generateGameId = generateGameId;
var uuid_1 = require("uuid");
/**
 * Genera un UUID v4 compatible con Node.js y navegadores.
 *
 * Usa crypto.randomUUID() si está disponible (Node 19+, todos los navegadores modernos),
 * de lo contrario usa una implementación de uuid.
 */
function generateId() {
    var _a;
    var g = globalThis;
    if ((_a = g === null || g === void 0 ? void 0 : g.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) {
        return g.crypto.randomUUID();
    }
    return (0, uuid_1.v4)();
}
function generateUserId() {
    return generateId();
}
function generateEventId() {
    return generateId();
}
function generateMatchId() {
    return generateId();
}
function generateGameId() {
    return generateId();
}

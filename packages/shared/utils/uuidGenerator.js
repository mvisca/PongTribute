"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   uuidGenerator.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 02:59:13 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEventId = generateEventId;
exports.generateUserId = generateUserId;
exports.generateMatchId = generateMatchId;
exports.generateGameId = generateGameId;
exports.generateTournamentId = generateTournamentId;
const crypto_1 = require("crypto");
function generateEventId() {
    return (0, crypto_1.randomUUID)();
}
function generateUserId() {
    return (0, crypto_1.randomUUID)();
}
function generateMatchId() {
    return (0, crypto_1.randomUUID)();
}
function generateGameId() {
    return (0, crypto_1.randomUUID)();
}
function generateTournamentId() {
    return (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=uuidGenerator.js.map
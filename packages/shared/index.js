"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/21 18:10:50 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./types/branded.types"), exports);
__exportStar(require("./types/user.types"), exports);
__exportStar(require("./types/friendship.types"), exports);
// export * from './types/game.types';
// export * from './types/matchmaking.types';
// Events
__exportStar(require("./events/base/BaseEvent"), exports);
__exportStar(require("./events/user/UserEvents"), exports);
// export * from './events/friendship/FriendshipEvents';
// export * from './events/game/GameEvents';
// export * from './events/matchmaking/MatchmakingEvents';
// Constants
__exportStar(require("./constants/game.constants"), exports);
__exportStar(require("./constants/friendship.constants"), exports);
// Utils
__exportStar(require("./utils/uuidGenerator"), exports);
//# sourceMappingURL=index.js.map
"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserEvents.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:35:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 01:35:50 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDeletedEvent = exports.UserStatusChangedEvent = exports.UserProfileUpdatedEvent = exports.UserLoggedOutEvent = exports.UserLoggedInEvent = exports.UserRegisteredEvent = void 0;
const BaseEvent_1 = require("../base/BaseEvent");
/**
 * Evento: Usuario registrado exitosamente
 */
class UserRegisteredEvent extends BaseEvent_1.BaseEvent {
    user;
    constructor(user) {
        super('user.registered', 'auth-service');
        this.user = user;
    }
    toJSON() {
        return {
            id: this.id,
            eventType: this.eventType,
            timestamp: this.timestamp,
            user: this.user
        };
    }
}
exports.UserRegisteredEvent = UserRegisteredEvent;
/**
 * Evento: Usuario inició sesión
 */
class UserLoggedInEvent extends BaseEvent_1.BaseEvent {
    userId;
    alias;
    constructor(userId, alias) {
        super('user.logged_in', 'auth-service');
        this.userId = userId;
        this.alias = alias;
    }
    toJSON() {
        return {
            id: this.id,
            eventType: this.eventType,
            timestamp: this.timestamp,
            userId: this.userId,
            alias: this.alias
        };
    }
}
exports.UserLoggedInEvent = UserLoggedInEvent;
/**
 * Evento: Usuario cerró sesión
 */
class UserLoggedOutEvent extends BaseEvent_1.BaseEvent {
    userId;
    constructor(userId) {
        super('user.logged_out', 'auth-service');
        this.userId = userId;
    }
    toJSON() {
        return {
            id: this.id,
            eventType: this.eventType,
            timestamp: this.timestamp,
            userId: this.userId
        };
    }
}
exports.UserLoggedOutEvent = UserLoggedOutEvent;
/**
 * Evento: Perfil de usuario actualizado
 */
class UserProfileUpdatedEvent extends BaseEvent_1.BaseEvent {
    userId;
    updatedFields;
    constructor(userId, updatedFields) {
        super('user.profile_updated', 'user-service');
        this.userId = userId;
        this.updatedFields = updatedFields;
    }
    toJSON() {
        return {
            id: this.id,
            eventType: this.eventType,
            timestamp: this.timestamp,
            userId: this.userId,
            updatedFields: this.updatedFields
        };
    }
}
exports.UserProfileUpdatedEvent = UserProfileUpdatedEvent;
/**
 * Evento: Usuario cambió estado online/offline
 */
class UserStatusChangedEvent extends BaseEvent_1.BaseEvent {
    userId;
    isOnline;
    constructor(userId, isOnline) {
        super('user.status_changed', 'user-service');
        this.userId = userId;
        this.isOnline = isOnline;
    }
    toJSON() {
        return {
            id: this.id,
            eventType: this.eventType,
            timestamp: this.timestamp,
            userId: this.userId,
            isOnline: this.isOnline
        };
    }
}
exports.UserStatusChangedEvent = UserStatusChangedEvent;
/**
 * Evento: Usuario eliminado
 */
class UserDeletedEvent extends BaseEvent_1.BaseEvent {
    userId;
    constructor(userId) {
        super('user.deleted', 'user-service');
        this.userId = userId;
    }
    toJSON() {
        return {
            id: this.id,
            eventType: this.eventType,
            timestamp: this.timestamp,
            userId: this.userId
        };
    }
}
exports.UserDeletedEvent = UserDeletedEvent;
//# sourceMappingURL=UserEvents.js.map
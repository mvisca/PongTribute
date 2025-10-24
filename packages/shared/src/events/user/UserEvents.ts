/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserEvents.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:35:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/23 12:04:40 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { BaseEvent } from '../base/BaseEvent';
import { UserId } from '../../types/branded.types';
import { UserResponse } from '../../types/user.types';

/**
 * Evento: Usuario registrado exitosamente
 */
export class UserRegisteredEvent extends BaseEvent {
  constructor(public readonly user: UserResponse) {
    super('user.registered', 'auth-service');
  }

  toJSON(): object {
    return {
      id: this.id,
      eventType: this.eventType,
      timestamp: this.timestamp,
      user: this.user
    };
  }
}

/**
 * Evento: Usuario inició sesión
 */
export class UserLoggedInEvent extends BaseEvent {
  constructor(
    public readonly userId: UserId,
    public readonly alias: string
  ) {
    super('user.logged_in', 'auth-service');
  }

  toJSON(): object {
    return {
      id: this.id,
      eventType: this.eventType,
      timestamp: this.timestamp,
      userId: this.userId,
      alias: this.alias
    };
  }
}

/**
 * Evento: Usuario cerró sesión
 */
export class UserLoggedOutEvent extends BaseEvent {
  constructor(public readonly userId: UserId) {
    super('user.logged_out', 'auth-service');
  }

  toJSON(): object {
    return {
      id: this.id,
      eventType: this.eventType,
      timestamp: this.timestamp,
      userId: this.userId
    };
  }
}

/**
 * Evento: Perfil de usuario actualizado
 */
export class UserProfileUpdatedEvent extends BaseEvent {
  constructor(
    public readonly userId: UserId,
    public readonly updatedFields: string[]
  ) {
    super('user.profile_updated', 'user-service');
  }

  toJSON(): object {
    return {
      id: this.id,
      eventType: this.eventType,
      timestamp: this.timestamp,
      userId: this.userId,
      updatedFields: this.updatedFields
    };
  }
}

/**
 * Evento: Usuario cambió estado online/offline
 */
export class UserStatusChangedEvent extends BaseEvent {
  constructor(
    public readonly userId: UserId,
    public readonly isOnline: boolean
  ) {
    super('user.status_changed', 'user-service');
  }

  toJSON(): object {
    return {
      id: this.id,
      eventType: this.eventType,
      timestamp: this.timestamp,
      userId: this.userId,
      isOnline: this.isOnline
    };
  }
}

/**
 * Evento: Usuario eliminado
 */
export class UserDeletedEvent extends BaseEvent {
  constructor(public readonly userId: UserId) {
    super('user.deleted', 'user-service');
  }

  toJSON(): object {
    return {
      id: this.id,
      eventType: this.eventType,
      timestamp: this.timestamp,
      userId: this.userId
    };
  }
}
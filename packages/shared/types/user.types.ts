/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.types.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 15:41:41 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { UserId, Email } from './branded.types';

/**
* User Base - forma más básica
*/
export interface UserBase {
	username: string;
	email: Email;
	avatar?: string;
}

/**
* DTO IN - Registro desde frontend
*/
export interface UserRegister extends UserBase {
	password: string; // Texto plano
}

/**
* DATA - Para crear en DB (con password hasheado)
*/
export interface CreateUserData extends UserBase {
	passwordHash: string; // Hasheado
}

/**
* Entidad completa en DB
*/
export interface User extends CreateUserData {
	id: UserId;
	isOnline: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
* DTO OUT - Sin passwordHash
*/
export type UserResponse = Omit<User, 'passwordHash'>;

/**
* DTO IN - Actualizar usuario
*/
export type UserUpdate = Omit<
Partial<User>,
| 'id'
| 'isOnline'
| 'passwordHash'
| 'createdAt'
| 'updatedAt'
>;

/**
* DTO IN - Login
*/
export interface UserLogin {
	email: Email;
	password: string;
}
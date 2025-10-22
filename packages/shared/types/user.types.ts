/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.types.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/22 18:06:57 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { UserId, Email } from './branded.types';

/**
* DTO IN - Registro desde frontend
*/
export interface UserRegister {
	username: string;
	email: Email;
	avatar?: string;
	password: string; // Texto plano
}

/**
* DATA - Para crear en DB (con password hasheado)
*/
export interface CreateUserData {
	username: string;
	email: Email;
	avatar?: string;
	passwordHash: string; // Hasheado
}

/**
* Entidad completa en DB
*/
export interface User {
	id: UserId;
	username: string;
	email: Email;
	avatar?: string;
	passwordHash: string; // Hasheado
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
export interface UserUpdate {
	email?: Email;
	username?: string;
	avatar?: string;	
};

/**
* DTO IN - Login
*/
export interface UserLogin {
	email: Email;
	password: string;
}
/**
 * DTO IN - Update password
 */
export interface UserPasswordUpdate {
	currentPasswordHash: string;
	newPasswordHash: string;
}
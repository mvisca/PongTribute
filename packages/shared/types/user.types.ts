/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.types.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/15 13:04:41 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 14:19:40 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { UserId } from "../types/branded.types";

/**
 * Usuario de la plataforma
 */
export interface User {
	id: UserId;
	alias: string;
	email?: string; // usar tipo email
	avatar?: string;
	createdAt: number;
}

/**
 * Credenciales de login
 */
export interface UserCredentials {
	email: string;
	password: string;
}

/**
 * Perfil público de usuario (sin datos sensibles)
 */
export interface UserProfile {
	id: UserId;
	alias: string;
	avatar: string;	
}
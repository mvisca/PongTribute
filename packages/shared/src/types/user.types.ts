import { UserId, Email } from "./branded.types";

// ============================================================================
// DTOs - INPUT (Crear / Login / Update)
// ============================================================================

/**
 * DTO IN - Registro desde frontend
 * Datos enviados por el usuario al registrarse
 */
export interface UserRegister {
  username: string;
  email: Email;
  avatar?: string;
  password: string; // Texto plano
}

/**
 * Datos para crear usuario en DB
 * Password ya hasheado
 */
export interface CreateUserData {
  username: string;
  email: Email;
  avatar?: string;
  passwordHash: string; // Hasheado
}

/**
 * DTO IN - Login
 * Credenciales del usuario
 */
export interface UserLogin {
  email: Email;
  password: string;
}

/**
 * DTO IN - Update password
 * Passwords ya hasheadas
 */
export interface UserPasswordUpdate {
  currentPasswordHash: string;
  newPasswordHash: string;
}

/**
 * DTO IN - Actualizar usuario
 * Datos editables
 */
export interface UserUpdate {
  email?: Email;
  username?: string;
  avatar?: string;
}

// ============================================================================
// ENTIDAD DE DOMINIO
// ============================================================================

/**
 * Usuario completo en DB
 * Representa la entidad persistida
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

// ============================================================================
// DTOs - OUTPUT
// ============================================================================

/**
 * DTO OUT - Usuario sin passwordHash
 * Enviado al frontend
 */
export type UserResponse = Omit<User, "passwordHash">;

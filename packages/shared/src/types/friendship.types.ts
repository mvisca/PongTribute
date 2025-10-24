import { UserId } from "./branded.types";
import type { FriendshipStatus } from "../constants/friendship.constants";

// ============================================================================
// ENTIDAD DE DOMINIO
// ============================================================================

/**
 * Amistad entre dos usuarios
 * Representa la relación y su estado actual
 */
export interface Friendship {
  userId: UserId;
  friendId: UserId;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DTOs - INPUT (Crear / Actualizar)
// ============================================================================

/**
 * DTO IN - Crear amistad
 * Enviada por el backend al crear relación
 */
export interface CreateFriendshipData {
  userId: UserId;
  friendId: UserId;
  status: FriendshipStatus; // default 'pending'
}

/**
 * DTO IN - Actualizar amistad
 * Solo puede cambiar status y updatedAt
 */
export interface UpdateFriendshipData {
  userId: UserId;
  friendId: UserId;
  status: FriendshipStatus;
  updatedAt: Date;
}

// ============================================================================
// REPRESENTACIÓN SQL (Snake_case)
// ============================================================================

/**
 * Row exacta de tabla 'friendships'
 * Expresa keys snake_case con los tipos de la tabla
 */
export interface FriendshipRow {
  user_id: string;      // UserId (UUID)
  friend_id: string;    // UserId (UUID)
  status: string;       // FriendshipStatus
  created_at: number;   // Unix timestamp
  updated_at: number;   // Unix timestamp
}

/**
 * Row limitada para update parcial
 * Solo status y updated_at
 */
export interface UpdateFriendshipRow {
  user_id: string;      // UserId (UUID)
  friend_id: string;    // UserId (UUID)
  status: string;       // FriendshipStatus
  updated_at: number;   // Unix timestamp
}

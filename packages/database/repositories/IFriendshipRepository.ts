import { FriendshipStatus } from '@transcendence/shared'; 
import { UserId } from '@transcendence/shared';
import * as FriendshipTypes from '@transcendence/shared';

/**
 * Interfaz que define el contrato para el repositorio de Friendship.
 * Especifica QUÉ operaciones deben implementarse, sin definir CÓMO.
 * 
 * Operaciones CRUD básicas:
 * - create()     → Crear usuario
 * - update(id, data) → Actualizar usuario  
 * - delete(id)       → Eliminar usuario
 * 
 * Consultas específicas:
 * - findByUsers(userId)		→ Buscar por ID de ambos
 * - findPendingRequest(userId)	→ Buscar por nombre status pending para id
 * - updateStatus(id, status)	→ Actualiza amistad
 * 
 * Permite implementar SQLite sin poner lógica de DB en lógica de negocio.
 */
export interface IFriendshipRepository {

	/**
	 * Crear nueva amistad entre dos usuarios
	*/
	create(
		data: FriendshipTypes.CreateFriendshipData)
	: Promise <FriendshipTypes.Friendship>;

	/**
	 * Actualiza estado de amistad
	 */
	update(
		data: FriendshipTypes.UpdateFriendshipData
	): Promise<FriendshipTypes.Friendship>;

	/**
	 * Elimiar amistad específica entre dos users
	 */
	delete(userId: UserId, friendId: UserId): Promise<void>;

	/**
	 * Busca amistad específica entre dos users
	 */
	findByUserAndFriend(
		userId: UserId, friendId: UserId
	): Promise<FriendshipTypes.Friendship | null>;

	/**
	 * Busca amistades de un user
	 */
	findByUser(userId: UserId): Promise<FriendshipTypes.Friendship[]>;

	/**
	 * El 'passwordHash' se incluye para validar la 'password' del usuario.
	 */
	findByUserAndStatus(
		userId: UserId,
		status: FriendshipStatus
	): Promise<FriendshipTypes.Friendship[]>;
}
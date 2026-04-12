import { FriendshipStatus, FriendshipTypes, UserTypes } from '@transcendence/shared';

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
	delete(userId: UserTypes.UserId, friendId: UserTypes.UserId): Promise<void>;

	/**
	 * Busca amistad específica entre dos users
	 */
	findByUserAndFriend(
		userId: UserTypes.UserId, friendId: UserTypes.UserId
	): Promise<FriendshipTypes.Friendship | null>;

	/**
	 * Busca amistades de un user
	 */
	findByUser(userId: UserTypes.UserId): Promise<FriendshipTypes.Friendship[]>;

	findByUserAndStatus(
		userId: UserTypes.UserId,
		status: FriendshipStatus
	): Promise<FriendshipTypes.Friendship[]>;

	/**
	 * Elimina friendships stale (rejected/pending) más antiguas que maxAgeDays.
	 * Retorna el número de filas eliminadas.
	 */
	cleanStale(maxAgeDays: number): Promise<number>;
}
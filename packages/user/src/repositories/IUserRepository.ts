// TODO estas interfaces deben estar en repository o en shared? por que?

import { Types } from '@transcendence/shared';

/**
 * Interfaz que define el contrato para el repositorio de Usuarios.
 * Especifica QUÉ operaciones deben implementarse, sin definir CÓMO.
 * 
 * Operaciones CRUD básicas:
 * - create(user)     → Crear usuario
 * - update(id, data) → Actualizar usuario  
 * - delete(id)       → Eliminar usuario
 * 
 * Consultas específicas:
 * - findById(id)           → Buscar por ID
 * - findByUsername(username) → Buscar por nombre de usuario
 * - findByEmail(email)     → Buscar por email
 * - findAll()              → Obtener todos los usuarios
 * - isUsernameTaken(username) → Verificar si username existe
 * - isEmailTaken(email)    → Verificar si email existe
 * 
 * Permite implementar SQLite sin poner lógica de DB en lógica de negocio.
 */
export interface IUserRepository {
	
	/**
	 * Crear nuevo usuario
	*/
	create(data: Types.CreateUserBody): Promise <Types.UserPublic>;

	/**
	 * Actualizar usuario
	 */
	update(id: string, data: Types.UpdateUserBody): Promise<Types.UserPublic | null>;

	/**
	 * Actualizar el 'passwordHash' de usuario
	 */
	updatePassword(id: string, newPasswordHass: string): Promise<void>;

	/**
	 * Eliminar usuario
	 */
	delete(id: string): Promise<void>;

	/**
	 * Buscar usuario por 'id'
	 */
	findById(id: string): Promise<Types.UserPublic | null>;

	/**
	 * Buscar usuario por 'username'
	 */
	findByUsername(username: string): Promise<Types.UserPublic | null>;

	/**
	 * Buscar usuario por 'email' ( CON 'passwordHash' solo para Auth )
	 */
	findByEmail(email: string): Promise<Types.UserInternal | null>;
	
	/**
	 * Verficar 'username' disponible
	 */
	isUsernameTaken(username: string): Promise<boolean>;

	/**
	 * Verificar 'email disponible
	 */
	isEmailTaken(email: string): Promise<boolean>;

	/**
	 * Actualizar 'isOnline'
	 */
    setOnlineStatus(id: string, isOnline: boolean): Promise<Types.UserPublic | null>;
}
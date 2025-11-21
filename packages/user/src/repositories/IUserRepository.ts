// TODO estas interfaces deben estar en repository o en shared? por que?

import { UserTypes } from '@transcendence/shared';

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
	create(data: UserTypes.CreateUserBody): Promise <UserTypes.UserPublic>;

	/**
	 * Actualizar usuario
	 */
	update(id: string, data: UserTypes.UpdateUserBody): Promise<UserTypes.UserPublic | null>;

	/**
	 * Actualizar el 'passwordHash' de usuario
	 */
	updatePassword(id: string, newPasswordHass: string): Promise<UserTypes.UserPublic | null>;

	/**
	 * Eliminar usuario
	 */
	delete(id: string): Promise<void>;

	/**
	 * Anonimiza usuario
	 */
	anonymize(id: string): Promise<UserTypes.UserPublic | null>;

	/**
	 * Buscar usuario por 'id'
	 */
	findById(id: string): Promise<UserTypes.UserPublic | null>;

	/**
	 * Buscar usuario por 'id'
	 */
	findByIdInternal(id: string): Promise<UserTypes.UserInternal | null>;

	/**
	 * Buscar usuario por 'username'
	 */
	findByUsername(username: string): Promise<UserTypes.UserPublic | null>;

	/**
	 * Buscar usuario por 'email' ( CON 'passwordHash' solo para Auth )
	 */
	findByEmail(email: string): Promise<UserTypes.UserInternal | null>;
	
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
    setOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic | null>;
}
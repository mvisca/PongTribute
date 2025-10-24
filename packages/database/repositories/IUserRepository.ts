import { Email, UserId } from '@transcendence/shared';
import * as UserTypes from '@transcendence/shared';

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
	 * Crear nuevo usuario \
	 * @param newUser de tipo {@link UserTypes.CreateUserData} \
	 * El Create User Data se compone a partir del {@link UserTypes.UserRegister} \
	 * Este tipo es cómo lo enviará el Front. \
	 * @returns {@link UserTypes.UserResponse} \
	 * Es cómo lo debe esperar el front en el response.
	*/
	create(data: UserTypes.CreateUserData): Promise <UserTypes.UserResponse>;

	/**
	 * Actualiza el User \
	 * @param id del User que se quiere actualizar \
	 * @param data los datos Partial que se quieren agregar \
	 * @returns record User sin 'passwordHash' 
	 */
	update(id: UserId, data: UserTypes.UserUpdate): Promise<UserTypes.UserResponse>;

	/**
	 * Actualizar el password del usuario \
	 * @param id del User del que se quiere actualizar la password \
	 * @param data con currentPasswordHash y newPassword
	 */
	updatePassword(id: UserId, newPasswordHass: string): Promise<void>;

	/**
	 * Elimina el User \
	 * @param id del User que se quiere eliminar \
	 */
	delete(id: UserId): Promise<void>;

	/**
	 * Busca el usuario por 'id' y si existe los devuelve \
	 * @param id del User que se quiere encontrar \
	 * @return record User sin 'passwordHash' o 'null' \
	 */
	findById(id: UserId): Promise<UserTypes.UserResponse | null>;

	/**
	 * Busca el usuario por 'username' y si existe lo devuelve \
	 * @param username del User que se busca
	 * @returns record User sin 'passwordHash' o 'null' \
	 */
	findByUsername(username: string): Promise<UserTypes.UserResponse | null>;

	/**
	 * Busca el usuario por 'email' y si existe lo devuelve \
	 * @param email del User que se busca
	 * @returns record User completo o 'null'
	 * Esta interfaz se aplicará en autenticación.
	 * El 'passwordHash' se incluye para validar la 'password' del usuario.
	 */
	findByEmail(email: Email): Promise<UserTypes.User | null>;
	
	/**
	 * Valida que 'username' esté disponible para crear nuevo User. \
	 * Wrapper de 'findByUsername()' \
	 * No valida tipo string de 'username', solo uniqueness.
	 */
	isUsernameTaken(username: string): Promise<boolean>;

	/**
	 * Valida que 'email' esté disponible para crear nuevo User. \
	 * Wrapper de 'findByEmail()' \
	 * No valida tipo Email de 'email', solo uniqueness.
	 */
	isEmailTaken(email: Email): Promise<boolean>;

	/**
	 * Actualiza el valor de isOnline del User. \
	 * Se altera cuando el User hace login, logout, desconecta o reconecta. \
	 * @param id del User cuyo estado se quiere actualizar. \
	 */
    setOnlineStatus(id: UserId, isOnline: boolean): Promise<UserTypes.UserResponse>;
}
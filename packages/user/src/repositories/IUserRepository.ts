import { AuthTypes, UserTypes } from '@transcendence/shared';

/**
 * Interfaz que define el contrato para el repositorio de Usuarios.
 * Especifica QUÉ operaciones deben implementarse, sin definir CÓMO.
 * Permite implementar SQLite sin poner lógica de DB en lógica de negocio.
 */
export interface IUserRepository {
    // ========================================================================
    // MUTATIONS - Lanzan excepción si fallan
    // ========================================================================
    
    /** Crear nuevo usuario */
    create(data: UserTypes.CreateUserBody): Promise<UserTypes.UserPublic>;
    
    /** Actualizar usuario - Lanza NotFoundError si no existe */
    update(id: string, data: UserTypes.UpdateUserBody): Promise<UserTypes.UserPublic>;
    
    /** Actualizar passwordHash - Lanza NotFoundError si no existe */
    updatePassword(id: string, newPasswordHash: string): Promise<UserTypes.UserPublic>;
    
    /** Eliminar usuario - Lanza NotFoundError si no existe */
    delete(id: string): Promise<void>;
    
    /** Anonimizar usuario - Lanza NotFoundError si no existe */
    anonymize(id: string): Promise<UserTypes.UserPublic>;
    
    /** Actualizar isOnline - Lanza NotFoundError si no existe */
    setOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic>;
    
    /** Actualizar estado 2FA - Lanza NotFoundError si no existe */
    update2FAStatus(
        userId: string,
        has2FAEnabled: boolean,
        totpSecret?: string,
        backupCodeHash?: string
    ): Promise<UserTypes.UserPublic>;
    
	/** Actualizar lastLogoutAt para caducar tokens de acceso*/
	updateLastLogoutAt(userId: string, lastLogoutAt: string): Promise<void>;

    // ========================================================================
    // QUERIES - Retornan null si no encuentran
    // ========================================================================
    
    /** Buscar usuario por id (sin passwordHash) */
    findUserById(id: string): Promise<UserTypes.UserPublic | null>;
    
    /** Buscar usuario por id (con passwordHash) */
    findUserByIdInternal(id: string): Promise<UserTypes.UserInternal | null>;
    
    /** Buscar usuario por username (sin passwordHash) */
    findUserByUsername(username: string): Promise<UserTypes.UserPublic | null>;
    
    /** Buscar usuario por email (con passwordHash) */
    findUserByEmailInternal(email: string): Promise<UserTypes.UserInternal | null>;
    
    /** Buscar usuario por email (con passwordHash) - alias */
    findUserByEmail(email: string): Promise<UserTypes.UserInternal | null>;

	/** Retorna el lastLogoutAt de un userId (timestamp en milisegundos) */
	getLastLogoutAt(userId:string): Promise<number | null>;

	// ========================================================================
    // CHECKERS - Retornan siempre un valor
    // ========================================================================

    /** Verificar si username está en uso */
    isUsernameTaken(username: string): Promise<boolean>;
    
    /** Verificar si email está en uso */
    isEmailTaken(email: string): Promise<boolean>;
}
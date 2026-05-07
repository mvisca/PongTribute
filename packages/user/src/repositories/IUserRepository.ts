import { AuthTypes, UserTypes } from '@transcendence/shared';

/**
 * Interface that defines the contract for the User repository.
 * Specifies WHAT operations must be implemented, without defining HOW.
 * Allows SQLite implementation without putting DB logic in business logic.
 */
export interface IUserRepository {
    // ========================================================================
    // MUTATIONS - Throw exception if they fail
    // ========================================================================
    
    /** Crear nuevo usuario */
    create(data: UserTypes.CreateUserBody): Promise<UserTypes.UserPublic>;
    
    /** Update user - Throws NotFoundError if not found */
    update(id: string, data: UserTypes.UpdateUserBody): Promise<UserTypes.UserPublic>;
    
    /** Update passwordHash - Throws NotFoundError if not found */
    updatePassword(id: string, passwordHash: string): Promise<UserTypes.UserPublic>;
    
    /** Delete user - Throws NotFoundError if not found */
    delete(id: string): Promise<void>;
    
    /** Anonymize user - Throws NotFoundError if not found */
    anonymize(id: string): Promise<UserTypes.UserPublic>;
    
    /** Update isOnline - Throws NotFoundError if not found */
    setOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic>;
    
    /** Update 2FA status - Throws NotFoundError if not found */
    update2FAStatus(
        userId: string,
        has2FAEnabled: boolean,
        totpSecret?: string,
        backupCodeHash?: string
    ): Promise<UserTypes.UserPublic>;
    
	/** Update lastLogoutAt to expire access tokens */
	updateLastLogoutAt(userId: string, lastLogoutAt: number): Promise<void>;

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

    /** Buscar usuario por OAuth provider e ID */
    findByOAuth(provider: AuthTypes.AuthProvider, oauthId: string): Promise<UserTypes.UserInternal | null>;

    /** Crear usuario OAuth (sin password) */
    createOAuthUser(data: {
        id: string;
        username: string;
        email: string;
        authProvider: string;
        oauthId: string;
        avatar?: string;
    }): Promise<UserTypes.UserInternal>;

    /** Vincular identidad OAuth a usuario existente */
    linkOAuthIdentity(userId: string, provider: string, oauthId: string): Promise<UserTypes.UserInternal>;

	/** Returns the lastLogoutAt of a userId (timestamp in milliseconds) */
	getLastLogoutAt(userId:string): Promise<number | null>;

	// ========================================================================
    // CHECKERS - Retornan siempre un valor
    // ========================================================================

    /** Check if username is already in use */
    isUsernameTaken(username: string): Promise<boolean>;
    
    /** Check if email is already in use */
    isEmailTaken(email: string): Promise<boolean>;
}
import { UserId, Email } from './branded.types';
/**
* DTO IN - Registro desde frontend
*/
export interface UserRegister {
    username: string;
    email: Email;
    avatar?: string;
    password: string;
}
/**
* DATA - Para crear en DB (con password hasheado)
*/
export interface CreateUserData {
    username: string;
    email: Email;
    avatar?: string;
    passwordHash: string;
}
/**
* Entidad completa en DB
*/
export interface User {
    id: UserId;
    username: string;
    email: Email;
    avatar?: string;
    passwordHash: string;
    isOnline: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
* DTO OUT - Sin passwordHash
*/
export type UserResponse = Omit<User, 'passwordHash'>;
/**
* DTO IN - Actualizar usuario
*/
export interface UserUpdate {
    email?: Email;
    username?: string;
    avatar?: string;
}
/**
* DTO IN - Login
*/
export interface UserLogin {
    email: Email;
    password: string;
}
/**
 * DTO IN - Update password
 */
export interface UserPasswordUpdate {
    currentPasswordHash: string;
    newPasswordHash: string;
}
//# sourceMappingURL=user.types.d.ts.map
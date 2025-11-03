
/**
 * Tipo interno para User Mapper\
 * Define los campos 
 */
export interface UserRow {
	id: string;
	username: string;
	email: string;
	password_hash: string;
	avatar: string;
	is_online: number;
	created_at: number;
	updated_at: number;
}
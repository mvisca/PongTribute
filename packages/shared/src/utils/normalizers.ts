/**
* Normalizador de datos de entrada\
* Responsabilidad:\
* - toLowerCase para case insensitive (username, email)
* - trim para limpiar inputs
* - formato consistente en búsqueda y comparación
*/
export class UserNormalizer {
	/**
	* Email para almacenar y buscar
	*/
	static email(email: string): string {
		return email.trim().toLowerCase();
	}
	
	/**
	* Username para búsqueda\
	* No se usa para almacenamiento para mantener 'iNPUTdelUseR' real\
	* Se usa para comparación INPUT('HoLa') => NORMALIZED('hola')
	*/
	static usernameForSearch(username: string): string {
		return username.trim().toLowerCase();
	}
	
	/**
	* Username para almacenar
	*/
	static usernameForStorage(username: string): string {
		return username.trim();
	}
	
	/**
	* Normaliza el avatar, solo trim
	*/
	static avatar(avatar: string): string {
		return avatar.trim();
	}
}
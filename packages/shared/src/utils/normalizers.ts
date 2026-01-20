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
	* Normaliza el avatar y valida URL
	*/
	static avatar(value?: string | null): string | undefined {
		if (!value) return undefined;
		if (typeof value !== 'string') return undefined;

		const trimmed = value.trim();
		if (trimmed === '') return undefined;

		// Validar que sea URL válida
		try {
			new URL(trimmed);
		} catch {
			console.warn(`[UserNormalizer] Avatar URL inválida: ${trimmed}`);
			return undefined;
		}

		// Validar que sea de Cloudinary
		if (!trimmed.startsWith('https://res.cloudinary.com/')) {
			console.warn(`[UserNormalizer] Avatar URL no es de Cloudinary: ${trimmed}`);
			return undefined;
		}

		return trimmed;
	}
}
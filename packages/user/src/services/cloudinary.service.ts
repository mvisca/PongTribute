import { v2 as cloudinary } from 'cloudinary';
import { SharedErrors } from "@transcendence/shared";
import { UserEnv } from "../index.js";
import path from 'path';

export class CloudinaryService {
	constructor() {
		cloudinary.config({
			cloud_name: UserEnv.CLOUDINARY_CLOUD_NAME,
			api_key: UserEnv.CLOUDINARY_API_KEY,
			api_secret: UserEnv.CLOUDINARY_API_SECRET
		});
	}

	async uploadAvatar(base64: string, oldAvatar?: string): Promise<string> {
		// === 1. Validacion de tipo y formato básico ===
		if (!base64 || typeof base64 !== 'string')
			throw new Error('Falló en la transmisión de datos: avatar no es string');

		// Extraer MIME type (data:image/png;base64,...)
		const mimeMatch = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,/);
		if (!mimeMatch)
			throw new Error(`Avatar inválido: no tiene formato data URI`);

		// Validar mimeType
		const declaredMimeType = mimeMatch[1];
		const allowedMimes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
		if (!allowedMimes.includes(declaredMimeType))
			throw new Error(`Tipo imagen no permitido: ${declaredMimeType}`);

		// === 2. Decode base64 ===
		// Extraer data sin prefijo
		const base64Data = base64.split(',')[1];

		let imageBuffer: Buffer;
		try {
			imageBuffer = Buffer.from(base64Data, 'base64');
		} catch(err) {
			throw new Error('Avatar inválido: base64 inválido o corrupto');
		}

		// === 3. Tamaño del archivo ===
		const sizeBytes = imageBuffer.length;
		const sizeMB = sizeBytes / (1024 * 1024);

		if (sizeMB > 10)
			throw new Error(`Imagen muy grande: ${sizeMB.toFixed(2)}MB (máximo 10MB)`);

		if (sizeBytes < 100)
			throw new Error('Imagen muy pequeña, posible archivo corrupto');

		// === 4. Magic bytes (contenido real) ===
		const magicValidation = this.validateImageMagicBytes(imageBuffer);

		if (!magicValidation.isValid)
			throw new Error('Avatar inválido: el archivo no es una imagen real');

		const normalizedDeclared = declaredMimeType === 'image/jpg' ? 'image/jpeg' : declaredMimeType;
		if (magicValidation.detectedMimeType !== normalizedDeclared) {
			throw new Error(`Inconsistencia de formato: declarado=${declaredMimeType},` +
				`detectado=${magicValidation.detectedMimeType}`
			);
		}

		// === 5. Imagen apta para Cloudinary ===
		// Imagen válida a partir de aquí
		try {
			// Subir a Cloudinary
			const result = await cloudinary.uploader.upload(base64, {
				folder: 'transcendence',
				resource_type: 'image',
				transformation: [
					{ width: 400, height: 400, crop: 'fill' },
					{ quality: 'auto' },
					{ fetch_format: 'auto' }
				],
				allowed_formats: ['png', 'jpg', 'jpeg', 'webp']
			});

			if (oldAvatar && oldAvatar !== UserEnv.CLOUDINARY_DEFAULT_AVATAR)
				await this.deleteAvatar(oldAvatar).catch(err => 
					console.warn('No se pudo borrar el avatar anterior: ', err)
				);

			return result.secure_url;
		} catch(err) {
			const error = err as any;
			throw new Error(`Cloudinary error: ${error.message}`);
		}
	}

	async deleteAvatar(oldAvatar: string): Promise<void> {
		try {

			if (!this.isCloudinaryUrl(oldAvatar))
				throw new Error(`URL no es de Cloudinary: ${oldAvatar}`);

			const publicId = this.extractPublicId(oldAvatar);

			if (!publicId)
				throw new Error(`No se pudo extraer public_id de: ${oldAvatar}`);

			await cloudinary.uploader.destroy(publicId);
		}catch(err) {
			// Relanzar error que se manejará en uploadAvatar
			throw err;
		}
	}

	/** Verifica que la URL sea de Cloudinary */
	private isCloudinaryUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname.includes('cloudinary.com');
		}catch(err) {
			return false;
		}
	}

	/** Extrae public_id de URL de Cloudinary */
	private extractPublicId(url: string): string | null {
		try {

			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			const match = pathname.match(/\/image\/upload\/(?:v\d+\/)?(.*?)(?:\.[^.]+)?$/);
			
			if (!match || !match[1])
				return null;

			return match[1];
		}catch(err) {
			return null;
		}
	}

	/** Valida que el buffer contenga una imagen real con magic bytes */
	private validateImageMagicBytes(buffer: Buffer): {
		isValid: boolean;
		detectedMimeType: string | null
	} {
		const signatures = {
			png: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
			jpg: Buffer.from([0xFF, 0xD8, 0xFF]),
			webp: Buffer.from([0x52, 0x49, 0x46, 0x46])
		};

		if (buffer.subarray(0, 8).equals(signatures.png))
			return { isValid: true, detectedMimeType: 'image/png'};

	   if (buffer.subarray(0, 3).equals(signatures.jpg))
    	    return { isValid: true, detectedMimeType: 'image/jpeg' };

	    if (buffer.subarray(0, 4).equals(signatures.webp)) {
    	    const webpSignature = buffer.subarray(8, 12).toString('ascii');
        	if (webpSignature === 'WEBP') {
            	return { isValid: true, detectedMimeType: 'image/webp' };
    	    }
    	}
	    return { isValid: false, detectedMimeType: null };
	}
}
// TODO reparar en auth el refresh token que debe ir por cookie y falta un endpoint al parecer para que cliente solicite renovacion, debe estar todo el flujopara este proceso
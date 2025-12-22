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
		if (!base64 || typeof base64 !== 'string')
			throw new Error('Falló en la transmisión de datos: avatar no es string');

		// Extraer MIME type (data:image/png;base64,...)
		const mimeMatch = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,/);
		if (!mimeMatch)
			throw new Error(`Avatar inválido: no tiene formato data URI`);

		// Validar mimeType
		const mimeType = mimeMatch[1];
		if (!['image/png', 'image/jpg', 'image/jpeg', 'image/webp'].includes(mimeType))
			throw new Error(`Tipo imagen no permitido: ${mimeType}`);

		// Extraer data sin prefijo
		const base64Data = base64.split(',')[1];

		const sizeBytes = Buffer.byteLength(base64Data, 'base64');
		const sizeMB = sizeBytes / (1024 * 1024);

		if (sizeMB > 10)
			throw new Error(`Imagen muy grande: ${sizeMB.toFixed(2)}MB (máximo 10MB)`);

		// Imagen válida a partir de aquí
		try {
			// Subir a Cloudinary
			const result = await cloudinary.uploader.upload(base64, {
				folder: 'transcendence',
				resource_type: 'auto',
				transformation: [
					{ width: 400, height: 400, crop: 'fill' },
					{ quality: 'auto' }
				]
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
}
// TODO reparar en auth el refresh token que debe ir por cookie y falta un endpoint al parecer para que cliente solicite renovacion, debe estar todo el flujopara este proceso
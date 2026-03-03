import { SharedErrors } from '@transcendence/shared';
import { v2 as cloudinary } from 'cloudinary';
import { ImagesEnv } from '../config.js';

export class CloudinaryService {
	private static readonly ALLOWED_MIMES = new Set([
		'image/png',
		'image/jpg',
		'image/jpeg',
		'image/webp'
	]);

	private static readonly MAX_SIZE_MB = 10;

	constructor() {
		cloudinary.config({
			cloud_name: ImagesEnv.CLOUDINARY_CLOUD_NAME(),
			api_key: ImagesEnv.CLOUDINARY_API_KEY(),
			api_secret: ImagesEnv.CLOUDINARY_API_SECRET(),
			secure: true
		});
	}

	async ping(): Promise<void> {
		try {
			await cloudinary.api.ping();
		} catch (error) {
			throw new SharedErrors.ServiceError(
				'cloudinary',
				'Cloudinary no disponible',
				{ error: error instanceof Error ? error.message : String(error) }
			);
		}
	}

	async uploadAvatar(base64: string, oldAvatar?: string | null): Promise<string> {
		this.validateBase64(base64);

		try {
			const result = await cloudinary.uploader.upload(base64, {
				folder: 'transcendence',
				resource_type: 'image',
				transformation: [
					{ width: 400, height: 400, crop: 'fill' },
					{ quality: 'auto' },
					{ gravity: 'auto' },
					{ fetch_format: 'auto' }
				],
				allowed_formats: ['png', 'jpg', 'jpeg', 'webp']
			});

			if (oldAvatar && oldAvatar !== ImagesEnv.CLOUDINARY_DEFAULT_AVATAR()) {
				await this.deleteAvatar(oldAvatar);
			}

			return result.secure_url;
		} catch (error) {
			throw new SharedErrors.ServiceError(
				'cloudinary',
				'Fallo al subir avatar a Cloudinary',
				{ error: error instanceof Error ? error.message : String(error) }
			);
		}
	}

	async deleteAvatar(url: string): Promise<void> {
		if (!this.isCloudinaryUrl(url))
			return;

		const publicId = this.extractPublicId(url);

		if (!publicId) {
			throw new SharedErrors.ValidationError(
				`No se pudo extraer public_id de ${url}`,
				'url',
				{ url }
			);
		}

		try {
			await cloudinary.uploader.destroy(publicId);
		} catch (error) {
			throw new SharedErrors.ServiceError(
				'cloudinary',
				'Fallo al eliminar avatar en Cloudinary',
				{ error: error instanceof Error ? error.message : String(error), publicId }
			);
		}
	}

	private validateBase64(base64: string): void {
		const match = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,/);
		if (!match) {
			throw new SharedErrors.ValidationError('Invalid base64 format', 'base64');
		}

		const mime = match[1];
		if (!CloudinaryService.ALLOWED_MIMES.has(mime)) {
			throw new SharedErrors.ValidationError(`Tipo mime invalido: ${mime}`, 'base64', { mime });
		}

		const data = base64.split(',')[1];
		if (!data) {
			throw new SharedErrors.ValidationError('No se encontro contenido base64', 'base64');
		}

		const sizeInBytes = Buffer.byteLength(data, 'base64');
		const sizeMb = sizeInBytes / (1024 * 1024);
		if (sizeMb > CloudinaryService.MAX_SIZE_MB) {
			throw new SharedErrors.ValidationError(
				`Imagen demasiado grande: ${sizeMb.toFixed(2)}MB (max ${CloudinaryService.MAX_SIZE_MB}MB)`,
				'base64',
				{ sizeMb }
			);
		}
	}

	private isCloudinaryUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return parsed.host.includes('cloudinary.com');
		} catch {
			return false;
		}
	}

	private extractPublicId(url: string): string | null {
		try {
			const parsed = new URL(url);
			const match = parsed.pathname.match(/\/image\/upload\/(?:v\d+\/)?(.*?)(?:\.[^.]+)?$/);
			return match ? match[1] : null;
		} catch {
			return null;
		}
	}
}

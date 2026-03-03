import { FastifyReply, FastifyRequest } from 'fastify';
import { SharedErrors } from '@transcendence/shared';
import { CloudinaryService } from '../services/CloudinaryService.js';

interface UploadBody {
	base64: string;
	old_avatar?: string;
}

interface DeleteBody {
	url: string;
}

export class ImagesController {
	constructor(private readonly cloudinaryService: CloudinaryService) {}

	async upload(
		request: FastifyRequest<{ Body: UploadBody }>,
		reply: FastifyReply
	): Promise<void> {
		const { base64, old_avatar } = request.body ?? {};

		if (!base64) {
			throw new SharedErrors.ValidationError('base64 required', 'base64');
		}

		const url = await this.cloudinaryService.uploadAvatar(base64, old_avatar);
		reply.status(200).send({ url });
	}

	async delete(
		request: FastifyRequest<{ Body: DeleteBody }>,
		reply: FastifyReply
	): Promise<void> {
		const { url } = request.body ?? {};

		if (!url) {
			throw new SharedErrors.ValidationError('url required', 'url');
		}

		await this.cloudinaryService.deleteAvatar(url);
		reply.status(204).send();
	}
}

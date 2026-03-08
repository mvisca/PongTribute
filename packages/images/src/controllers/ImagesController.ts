import { FastifyReply, FastifyRequest } from 'fastify';
import { ImageSchemas, SharedErrors } from '@transcendence/shared';
import { IImageStorageService } from '../ports/IImageStorageService.js';

export class ImagesController {
	constructor(private readonly cloudinaryService: IImageStorageService) {}

	async upload(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const body = request.body as ImageSchemas.ImageUploadRequestType;
			const { base64, old_avatar } = body;
			const url = await this.cloudinaryService.uploadAvatar(base64, old_avatar);
			reply.status(200).send({ url });
		} catch (error) {
			return SharedErrors.handleError(error, reply);
		}
	}

	async delete(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const body = request.body as ImageSchemas.ImageDeleteRequestType;
			const { url } = body;
			await this.cloudinaryService.deleteAvatar(url);
			reply.status(204).send();
		} catch (error) {
			return SharedErrors.handleError(error, reply);
		}
	}
}

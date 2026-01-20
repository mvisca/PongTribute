import { Static } from '@sinclair/typebox';
import * as IS from '../schemas/index.js';

export namespace ImageSchemas {
	export type ImageUploadRequestType = Static<typeof IS.ImageUploadRequestSchema>;
	export type ImageDeleteRequestType = Static<typeof IS.ImageDeleteRequestSchema>;
	export type ImageUploadResponseType = Static<typeof IS.ImageUploadResponseSchema>;
}
import { Static } from '@sinclair/typebox';
import * as IS from '../schemas/index.js';

export namespace ImageSchemas {
	export type ImageUploadRequestType = Static<typeof IS.ImageUploadRequest>;
	export type ImageDeleteRequestType = Static<typeof IS.ImageDeleteRequest>;
}
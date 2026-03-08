import { Type } from '@sinclair/typebox';

export const ImageUploadRequestSchema = Type.Object({
  base64: Type.String({
    format: 'binary',
    pattern: '^data:image\\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$',
    minLength: 100,
    maxLength: 13_300_000, // ~10MB en base64
  }),
  old_avatar: Type.Optional(Type.String({ format: 'uri' })),
}, { additionalProperties: false });

export const ImageDeleteRequestSchema = Type.Object({
  url: Type.String({
    format: 'uri',
    pattern: '^https://res\\.cloudinary\\.com/',
  }),
}, { additionalProperties: false });

export const ImageUploadResponseSchema = Type.Object({
	url: Type.String({
		format: 'uri',
		pattern: '^https://res\\.cloudinary\\.com/'
	}),
}, { additionalProperties: false });

export const ImageUploadRouteSchema = {
	description: 'Sube una imagen de avatar a Cloudinary',
	tags: ['Images'],
	body: ImageUploadRequestSchema,
	response: {
		200: ImageUploadResponseSchema
	}
};

export const ImageDeleteRouteSchema = {
	description: 'Elimina una imagen de avatar de Cloudinary',
	tags: ['Images'],
	body: ImageDeleteRequestSchema,
	response: {
		204: Type.Null()
	}
};
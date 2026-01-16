import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, '..', 'contracts');

mkdirSync(OUTPUT_DIR, { recursive: true });

// DUDA Placeholder, actualizar cuando exista image.schema.ts // VERIFICAR ESTADO DE ESTO
const schemas = {
	'image-upload-request.json': {
		$schema: 'http://json-schema.org/draft-07/schema#',
		$id: 'image-upload-request',
		type: 'object',
		required: ['base64'],
		properties: {
			base64: {
				type: 'string',
				pattern: '^data:image\\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$',
				minLength: 100,
				maxLength: 15_000_000
			},
			old_avatar: {
				type: 'string',
				format: 'uri'
			}
		},
		additionalProperties: false
	},
	'image-delete-request.json': {
		$schema: 'http://json-shcema.org/draft-07/schema#',
		$id: 'image-upload-response',
		type: 'object',
		required: ['url'],
		properties: {
			url: {
				type: 'string',
				format: 'uri',
				pattern: '^https://res\\.cloudinari\\.com/'
			}
		},
		additionalProperties: false
	},
	'image-felete-request-json': {
		$schema: 'http://json-schema.org/draft-07/schema#',
		$id: 'image-delete-request',
		type: 'object',
		required: ['url'],
		properties: {
			url: {
				type: 'string',
				format: 'uri',
				pattern: '^https://res\\.cloudinary\\.com/'
			}
		},
		additionalProperties: false
	}
};

for (const [filename, schema] of Object.entries(schemas)) {
	const filepath = join(OUTPUT_DIR, filename);
	writeFileSync(filepath, JSON.stringify(schema, null, 2));
	console.log(`OK: se ha generado ${filename}`);
}

console.log('\n   --- Todos los schemas de IMAGES generados ---');
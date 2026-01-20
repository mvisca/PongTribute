import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
	ImageUploadRequestSchema,
	ImageDeleteRequestSchema,
	ImageUploadResponseSchema } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, '..', 'contracts');

mkdirSync(OUTPUT_DIR, { recursive: true });

const schemas = {
	'image-upload-request.json': ImageUploadRequestSchema,
	'image-delete-request.json': ImageDeleteRequestSchema,
	'image-upload-response.json': ImageUploadResponseSchema
};

for (const [filename, schema] of Object.entries(schemas)) {
	const filepath = join(OUTPUT_DIR, filename);
	writeFileSync(filepath, JSON.stringify(schema, null, 2));
	console.log(`OK: se ha generado ${filename}`);
}

console.log('\n   --- Todos los schemas de IMAGES generados ---');
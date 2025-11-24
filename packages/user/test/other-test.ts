// ============================================================================
// TEST VARIOS
// ============================================================================

// Test path.resolve
console.log("=== TEST PATH 'path.resolve()' ===\n");

// Import to test
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fullPath = path.resolve(__dirname, './concatEnv');
console.log(`FULL_PATH=${fullPath}`);

// Test dotenv.config 
console.log("\n=== TEST DOTENV 'dotenv.config( {...} )' & process.env.<key> ===\n");

// Import to test
import dotenv from 'dotenv';

dotenv.config({
	path: path.resolve(__dirname, '../.env'),
	quiet: true
});
dotenv.config({
	path: path.resolve(__dirname, '../../../.env'),
	quiet: true
});

console.log(`TEST=${process.env.TEST} en ${path.resolve(__dirname, '../')}`);
console.log(`CWD=${process.env.CWD} en ${path.resolve(__dirname, '../../../')}`);
console.log(`IS_OK=${process.env.IS_OK} en ${path.resolve(__dirname, '../../../')}`);

// Test UserMapper
console.log("\n=== TEST UserMapper ===\n");


// Import to test
import { UserTypes, Utils } from '@transcendence/shared';
import { UserMapper } from '../src/mappers/UserMapper.js';

// Simular una row de SQLite
const row: UserTypes.UserRow = {
  id: "abc-123",
  username: "testuser",
  email: "test@example.com",
  password_hash: "$2a$10$...",
  avatar: "https://example.com/avatar.jpg",
  is_online: 1,
  is_deleted: 0,
  created_at: 1730304000000,
  updated_at: 1730304000000
};

// Original Row
console.log('\nrow: ', row);
console.log('Typeof row.created_at: ', typeof(row.created_at));
console.log('Typeof row.is_online: ', typeof(row.is_online));
console.log('Row includes "password_hash"? ', (
	Object.keys(row).includes('password_hash') ? 'TRUE' : 'FALSE'
));

// Convertir a Internal
const internalFromRow = UserMapper.rowToInternal(row);
console.log('\ninternalFromRow: ', internalFromRow);
console.log('Typeof internalFromRow.createdAt: ', typeof(internalFromRow.createdAt));
console.log('Typeof internalFromRow.isOnline: ', typeof(internalFromRow.isOnline));
console.log('internalFromRow includes "passwordHash"? ', (
	Object.keys(internalFromRow).includes('passwordHash') ? 'TRUE' : 'FALSE'
));

// Convertir Internal a Row
const rowFromInternal = UserMapper.internalToRow(internalFromRow);
console.log('\nrowFromInternal: ', rowFromInternal);
console.log('Typeof rowFromInternal.created_at: ', typeof(rowFromInternal.created_at));
console.log('Typeof rowFromInternal.is_online: ', typeof(rowFromInternal.is_online));
console.log('rowFromInternal includes "password_hash"? ', (
	Object.keys(rowFromInternal).includes('password_hash') ? 'TRUE' : 'FALSE'
));

// Convertir Internal a Response
const responseFromInternal = UserMapper.internalToResponse(internalFromRow);
console.log('\nresponseFromInternal: ', responseFromInternal);
console.log('Typeof responseFromInternal.createdAt: ', typeof(responseFromInternal.createdAt));
console.log('Typeof responseFromInternal.isOnline: ', typeof(responseFromInternal.isOnline));
console.log('responseFromInternal includes "passwordHash"? ', (
	Object.keys(responseFromInternal).includes('passwordHash') ? 'TRUE' : 'FALSE'
));

// Convertir Response a Row (usando internal que tiene passwordHash)
const { password_hash, ...rowFromResponse } = UserMapper.internalToRow(internalFromRow);
console.log('\nrowFromResponse (sin password_hash): ', rowFromResponse);
console.log('Typeof rowFromResponse.created_at: ', typeof(rowFromResponse.created_at));
console.log('Typeof rowFromResponse.is_online: ', typeof(rowFromResponse.is_online));
console.log('rowFromResponse includes "password_hash"? ', (
	Object.keys(rowFromResponse).includes('password_hash') ? 'TRUE' : 'FALSE'
));

console.log("\n=== TEST generateUserId() ===\n");

console.log(`New User ID UUID: ${Utils.generateUserId()}`);

console.log("\n=== END TEST ===\n")
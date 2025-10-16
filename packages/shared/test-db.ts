// test-db.ts
import { getDatabase, closeDatabase } from './database/connection';
import { generateUserId } from './utils/uuidGenerator';
import type { Database } from 'better-sqlite3';

const db = getDatabase() as Database;

// Insertar usuario de prueba
const stmt = db.prepare(`
  INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

stmt.run(generateUserId(), 'alice', 'alice@test.com', 'hashed_pw', Date.now(), Date.now());

// Leer usuario
const user = db.prepare('SELECT * FROM users WHERE username = ?').get('alice');
console.log('✅ Usuario creado:', user);

closeDatabase();
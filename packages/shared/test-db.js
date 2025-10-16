"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-db.ts
var connection_1 = require("./database/connection");
var uuidGenerator_1 = require("./utils/uuidGenerator");
var db = (0, connection_1.getDatabase)();
// Insertar usuario de prueba
var stmt = db.prepare("\n  INSERT INTO users (id, username, email, password_hash, created_at, updated_at)\n  VALUES (?, ?, ?, ?, ?, ?)\n");
stmt.run((0, uuidGenerator_1.generateUserId)(), 'alice', 'alice@test.com', 'hashed_pw', Date.now(), Date.now());
// Leer usuario
var user = db.prepare('SELECT * FROM users WHERE username = ?').get('alice');
console.log('✅ Usuario creado:', user);
(0, connection_1.closeDatabase)();

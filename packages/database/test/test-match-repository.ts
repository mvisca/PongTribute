// ============================================================================
// TEST MATCH REPOSITORY
// packages/database/test/test-match-repository.ts
// ============================================================================

import * as SharedTypes from "../../shared/src";
import { SQLiteMatchRepository } from "../repositories/SQLiteMatchRepository";
import { SQLiteUserRepository } from "../repositories/SQLiteUserRepository";

import { getDatabase } from "../connection";
import { getDefaultHighWaterMark } from "stream";

async function testMatchRepository() {

	console.log('=== TEST MATCH REPOSITORY ===');
	
	const db = getDatabase();
	db.exec("DELETE FROM matches");
	db.exec("DELETE FROM friendship");
	db.exec("DELETE FROM users");

	const userRepo = new SQLiteUserRepository(db);
	const matchRepo = new SQLiteMatchRepository(db);

	// ============================================================================
	// CREAR USUARIOS
	// ============================================================================

	const toto = await userRepo.create({
		username: "toto",
		email: "toto@tita.com" as SharedTypes.Email,
		password: "passwordraw",
		avatar: "url/picture" 
	});

	const pepe = await userRepo.create({
		username: "pepe",
		email: "pepe@pepe.com" as SharedTypes.Email,
		password: "passwordraw",
		avatar: "image/path"
	});

	const tita = userRepo.create({
		username: "tita",
		email: "tita@tita.com" as SharedTypes.Email,
		password: "passwordraw",
		avatar: "otra/image"
	});

	console.log(`Usuarios creados: ${toto.username}`);
}


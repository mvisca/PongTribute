// packages/database/test/test-friendship-repository.ts

import { generateUserId, UserId, Email, UserLoggedInEvent, FRIENDSHIP_STATUS } from '@transcendence/shared';
import * as UserTypes from '@transcendence/shared';
import assert from "node:assert";

import { SQLiteFriendshipRepository } from "../repositories/SQLiteFriendshipRepository";
import { IFriendshipRepository } from "../repositories/IFriendshipRepository";
import { SQLiteUserRepository } from "../repositories/SQLiteUserRepository";
import { IUserRepository } from "../repositories/IUserRepository";

import { UserMapper } from '../mappers/UserMapper';
import { getDatabase } from '../connection';

async function testFriendshipRepository() {
	console.log("=== TEST FRIENDSHIP REPOSITORY ===\n");
	
	const db = getDatabase();
	db.exec('DELETE FROM friendships');
	db.exec('DELETE FROM users');
	
	const userRepo = new SQLiteUserRepository(db);
	const friendRepo = new SQLiteFriendshipRepository(db);
	
	// CREAR 3 USUARIOS
	console.log("\n--- CREAR USERS ---");
	const ana = await userRepo.create({
		username: "Ana",
		email: "aNa@test.com" as Email,
		passwordHash: "sdieuwekwnsdf",
		avatar: "antoher.com/image"
	});
	
	const beto = await userRepo.create({
		username: "beto",
		email: "beto@test.com" as Email,
		passwordHash: "jñksdlfaksdjf",
		avatar: "myimage.com/image"
	});
	
	const coco = await userRepo.create({
		username: "coco",
		email: "coco@test.com" as Email,
		passwordHash: "sdklfjasfkdjfajkdfs",
		avatar: "more.com/images"
	});
	
	console.log(`ana: ${ana.id}`);
	console.log(`beto: ${beto.id}`);
	console.log(`coco: ${coco.id}\n`);
	
	// CREAR RELACIONES
	console.log("--- CREAR FRIENDSHIPS ---");
	
	// A-B pending
	const abPending = await friendRepo.create({
		userId: ana.id,
		friendId: beto.id,
		status: FRIENDSHIP_STATUS.PENDING
	});
	console.log(`A-B: ${abPending.status}`);

	// A-C accepted
	const acAccepted = await friendRepo.create({
		userId: ana.id,
		friendId: coco.id,
		status: FRIENDSHIP_STATUS.ACCEPTED
	});
	console.log(`A-C: ${acAccepted.status}\n`);
	
	// TEST 1: Buscar todas para A
	console.log("--- TEST 1: findByUser(ana) ---");
	const anaFriends = await friendRepo.findByUser(ana.id);
	console.log(`Total: ${anaFriends.length}`);
	anaFriends.forEach(f => 
		console.log(` - ${f.userId} ↔ ${f.friendId}: ${f.status}`)
	);
	
	// TEST 2: Buscar específicas
	console.log("\n--- TEST 2: findByUserAndFriend ---");
	const ab = await friendRepo.findByUserAndFriend(ana.id, beto.id);
	console.log(`A-B: ${ab ? ab.status : 'null'}`);
	
	const bc = await friendRepo.findByUserAndFriend(beto.id, coco.id);
	console.log(`B-C: ${bc ? bc.status : 'null'}`);
	
	// TEST 3: Aceptar A-B
	console.log("\n--- TEST 3: update A-B → accepted ---");
	const updating = new Date();
	await friendRepo.update({
		userId: ana.id,
		friendId: beto.id,
		status: FRIENDSHIP_STATUS.ACCEPTED,
		updatedAt: updating
	});
	const abUpdated = await friendRepo.findByUserAndFriend(ana.id, beto.id);
	console.log(`A-B actualizado: ${abUpdated?.status}`);
	
	// TEST 4: Buscar accepted para A
	console.log("\n--- TEST 4: findByUserAndStatus(ana, accepted) ---");
	const anaAccepted = await friendRepo.findByUserAndStatus(
		ana.id, 
		FRIENDSHIP_STATUS.ACCEPTED
	);
	console.log(`Total accepted: ${anaAccepted.length}`);
	anaAccepted.forEach(f => 
		console.log(` - ${f.userId} ↔ ${f.friendId}`)
	);
	
	// TEST 4.5: Borrar Ana
/* 	console.log("\n--- TEST 4.5: delete Ana ---");

	const anaByUsername = await userRepo.findByUsername("ANA");
	if (anaByUsername) {
		console.log(`El id de Ana es: ${anaByUsername.id}`)
		userRepo.delete(anaByUsername.id);
	}
	console.log("Ana delete");
	const anaByUsername2 = await userRepo.findByUsername("ANA");
	if (!anaByUsername2)
		console.log("Ana no existe"); */

	// TEST 5: Borrar A-B
	console.log("\n--- TEST 5: delete A-B ---");
	// Descomentar 4.5, comentar la linea de abajo
	// Valida que delete(Ana) elimina en cascada \
	// los records friendship que tiene su UserId
	await friendRepo.delete(ana.id, beto.id);
	const abDeleted = await friendRepo.findByUserAndFriend(ana.id, beto.id);
	console.log(`A-B después delete: ${abDeleted ? 'existe' : 'null '}`);
	
	// TEST 6: Crear B-C
	console.log("\n--- TEST 6: create B-C ---");
	const showFriendship = await friendRepo.create({
		userId: beto.id,
		friendId: coco.id,
		status: FRIENDSHIP_STATUS.PENDING
	});
	console.log('Show friendship: ', showFriendship);
	const bcPending = await friendRepo.findByUserAndFriend(beto.id, coco.id);
	console.log(`B-C ${bcPending?.status}`);
	
	// TEST 7: Listar todas para B
	console.log("\n--- TEST 7: findByUser(beto) ---");
	const betoFriends = await friendRepo.findByUser(beto.id);
	console.log(`Total: ${betoFriends.length}`);
	betoFriends.forEach(f => 
		console.log(` - ${f.userId} ↔ ${f.friendId}: ${f.status}`)
	);
	
	// TEST 8: Bidireccionalidad
	console.log("\n--- TEST 8: Bidireccionalidad ---");
	// Crear con beto primero (orden invertido)
	const cbInverted = await friendRepo.findByUserAndFriend(coco.id, beto.id);
	console.log(`C-B (invertido): ${cbInverted ? cbInverted.status : 'null'}`);
	// Debe encontrar B-C creado antes
	
	// TEST 9: Edge cases
	console.log("\n--- TEST 9: Edge cases ---");
	// Usuario sin amigos
	const noFriends = await friendRepo.findByUser(coco.id);
	console.log(`coco amigos: ${noFriends.length}`);
	
	// TEST 10: Cleanup
	console.log("\n--- CLEANUP ---");
	db.exec('DELETE FROM friendships');
	db.exec('DELETE FROM users');
	console.log(' DB limpiada');
	
	console.log("\n=== TEST COMPLETO ===");
	db.close();
}

testFriendshipRepository();
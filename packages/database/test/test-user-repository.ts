// ============================================================================
// TEST USER REPOSITORY
// ============================================================================

import { getDatabase, closeDatabase } from "../src/connection";
import { SQLiteUserRepository } from "../src/repositories/SQLiteUserRepository";
import { Types } from "../../shared/src";

// ============================================================================
// AUXILIAR
// ============================================================================

function userExists(user: Types.UserInternal | Types.UserPublic | null) {
	!!user
	? console.log("User recuperado:", user)
	: console.log("No existe");
}

async function testUserRepository() {
	console.log("=== TEST USER REPOSITORY ===\n");
	
	// ============================================================================
	// SETUP
	// ============================================================================
	const db = getDatabase();
	const userRepo = new SQLiteUserRepository(db);
	console.log("Conexión DB establecida");
	
	// ============================================================================
	// TEST 1: Crear usuario
	// ============================================================================
	console.log("\n--- TEST 1: Crear usuario ---");
	
	let alice: Types.UserPublic | null = null;
	try {
		const createUserData: Types.CreateUserBody = {
			username: "Alice",
			email: "alice@test.com",
			passwordHash: `Timesamped_${Date.now()}`,
			avatar: "https://image.com/myimage.png",
		};
		alice = await userRepo.create(createUserData);
		console.log("Alice creada correctamente");
	} catch (err) {
		console.error(err);
	} finally {
		if (!alice) alice = await userRepo.findByUsername("Alice");
		console.log("Recuperada Alice de la base de datos");
	}
	
	if (alice) userExists(alice);
	else process.exit(1);
	
	// ============================================================================
	// TEST 2: findByEmail
	// ============================================================================
	console.log("\n--- TEST 2: findByEmail ---");
	
	console.log("2.1: User existe - Alice");
	const aliceByEmail = await userRepo.findByEmail("alice@test.com");
	userExists(aliceByEmail);
	
	console.log("\n2.2: User NO existe");
	const notExistByEmail = await userRepo.findByEmail("no-alice@test.com");
	userExists(notExistByEmail);
	
	// ============================================================================
	// TEST 3: findById
	// ============================================================================
	console.log("\n--- TEST 3: findById ---");
	
	console.log("3.1: User existe - Alice");
	const aliceById = await userRepo.findById(alice.id);
	userExists(aliceById);
	
	console.log("\n3.2: User NO existe");
	const notExistById = await userRepo.findById("nonexistent-id-123");
	userExists(notExistById);
	
	// ============================================================================
	// TEST 4: findByUsername
	// ============================================================================
	console.log("\n--- TEST 4: findByUsername ---");
	
	console.log("4.1: User existe - Alice");
	const aliceByUsername = await userRepo.findByUsername(alice.username);
	userExists(aliceByUsername);
	
	console.log("\n4.2: User NO existe");
	const notExistByUsername = await userRepo.findByUsername("Pepe");
	userExists(notExistByUsername);
	
	// ============================================================================
	// TEST 5: updatePassword & setOnlineStatus
	// ============================================================================
	console.log("\n--- TEST 5: updatePassword & setOnlineStatus ---");
	
	if (!aliceByEmail) process.exit(1);
	console.log("Password inicial:", aliceByEmail.passwordHash);
	console.log("Online inicial:", aliceByEmail.isOnline);
	
	await userRepo.updatePassword(aliceByEmail.id, `Timesamped_${Date.now()}`);
	console.log("Password actualizado");
	
	await userRepo.setOnlineStatus(
		aliceByEmail.id,
		!aliceByEmail.isOnline
	);
	console.log("Status online cambiado");
	
	const updatedAlice = await userRepo.findByEmail("alice@test.com");
	console.log("Password nuevo:", updatedAlice?.passwordHash);
	console.log("Online nuevo:", updatedAlice?.isOnline);
	
	// ============================================================================
	// TEST 6: Validations
	// ============================================================================
	console.log("\n--- TEST 6: Validations ---");
	
	console.log(
		`isEmailTaken('alice@test.com'): ${await userRepo.isEmailTaken("alice@test.com")}`
	);
	console.log(
		`isEmailTaken('pepe@test.com'): ${await userRepo.isEmailTaken("pepe@test.com")}`
	);
	
	console.log(
		`isEmailTaken('alICE@test.com'): ${await userRepo.isEmailTaken("alICE@test.com")}`
	);
	console.log(
		`isEmailTaken('pEpe@test.COM'): ${await userRepo.isEmailTaken("pEpe@test.COM")}`
	);
	
	console.log(
		`isUsernameTaken('Alice'): ${await userRepo.isUsernameTaken("Alice")}`
	);
	console.log(
		`isUsernameTaken('Pepe'): ${await userRepo.isUsernameTaken("Pepe")}`
	);
	
	console.log(
		`isUsernameTaken('ALICE'): ${await userRepo.isUsernameTaken("AliCE")}`
	);
	console.log(
		`isUsernameTaken('pePE'): ${await userRepo.isUsernameTaken("pePE")}`
	);
	
	// ============================================================================
	// TEST 7: delete
	// ============================================================================
	console.log("\n--- TEST 7: delete ---");
	
	let pepe: Types.UserPublic | null = null;
	try {
		const createUserData: Types.CreateUserBody = {
			username: "Pepe",
			email: "pepe@test.com",
			passwordHash: `Timesamped_${Date.now()}`,
			avatar: "https://image.com/myimage.png",
		};
		pepe = await userRepo.create(createUserData);
		console.log("Pepe creado correctamente");
	} catch {
		console.warn("Pepe ya estaba en la base de datos");
	} finally {
		if (!pepe) pepe = await userRepo.findByUsername("Pepe");
		console.log("Recuperado Pepe de la base de datos");
	}
	
	if (pepe) userExists(pepe);
	else process.exit(1);
	
	await userRepo.delete(pepe.id);
	console.log("Pepe borrado");
	
	const deletedPepe = await userRepo.findByUsername("pepe");
	userExists(deletedPepe);
	
	// ============================================================================
	// CLEANUP
	// ============================================================================
	// ============================================================================
	// CLEANUP
	// ============================================================================
	console.log("\n--- CLEANUP ---");
	db.exec("DELETE FROM friendships");
	db.exec("DELETE FROM match_players");
	db.exec("DELETE FROM matches");
	db.exec("DELETE FROM users");
	
	console.log(" *- DB limpia");
	
	console.log("\n=== TEST FRIENDSHIP COMPLETO ===");
	db.close();
}

testUserRepository();

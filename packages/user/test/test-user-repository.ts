// ============================================================================
// TEST USER REPOSITORY - Refactorizado con TestConstants
// ============================================================================

import { closeDatabase } from "../src/connection";
import { SQLiteUserRepository } from "../src/repositories/SQLiteUserRepository";
import { UserTypes, Utils, TestConstants } from "@transcendence/shared";

// ============================================================================
// AUXILIAR
// ============================================================================

function userExists(user: UserTypes.UserInternal | UserTypes.UserPublic | null) {
	!!user
		? console.log("User recuperado:", user)
		: console.log("No existe");
}

async function testUserRepository() {
	console.log("=== TEST USER REPOSITORY ===\n");

	// ============================================================================
	// SETUP
	// ============================================================================

	const userRepo = new SQLiteUserRepository();
	console.log("\n" + "#".repeat(40));
	console.log("Conexión DB establecida");
	console.log("#".repeat(40) + "\n");

	// ============================================================================
	// TEST 1: Crear usuario usando TestConstants
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 1: Crear usuario ---");
	console.log("#".repeat(40) + "\n");

	let alice: UserTypes.UserPublic | null = null;
	try {
		// ✅ Usar datos de TestConstants.TEST_USERS
		const testUser = TestConstants.TEST_USERS.user1;
		
		const createUserData: UserTypes.CreateUserBody & { id: string } = {
			id: Utils.generateUserId(),  // ✅ GENERAR ID
			username: testUser.username,
			email: testUser.email,
			passwordHash: `Hashed_${testUser.password}`,  // Simular hash
			avatar: testUser.avatar,
			isOnline: false,
			isDeleted: false,
			has2FAEnabled: false
		};

		// Limpiar si existe
		const aliceExists = await userRepo.findByUsername(testUser.username);
		if (aliceExists) {
			await userRepo.delete(aliceExists.id);
		}

		alice = await userRepo.create(createUserData);
		console.log("✅ Alice creada correctamente");
	} catch (err) {
		console.error("❌ Error creando Alice:", err);
	} finally {
		if (!alice) alice = await userRepo.findByUsername(TestConstants.TEST_USERS.user1.username);
		console.log("Recuperada Alice de la base de datos");
	}

	if (alice) userExists(alice);
	else {
		console.error("❌ FATAL: No se pudo crear Alice");
		process.exit(1);
	}

	// ============================================================================
	// TEST 2: findByEmail
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 2: findByEmail ---");
	console.log("#".repeat(40) + "\n");

	console.log("2.1: User existe - Alice");
	const aliceByEmail = await userRepo.findByEmail(TestConstants.TEST_USERS.user1.email);
	userExists(aliceByEmail);

	console.log("\n2.2: User NO existe");
	const notExistByEmail = await userRepo.findByEmail("no-existe@test.com");
	userExists(notExistByEmail);

	// ============================================================================
	// TEST 3: findById
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 3: findById ---");
	console.log("#".repeat(40) + "\n");

	console.log("3.1: User existe - Alice");
	const aliceById = await userRepo.findById(alice.id);
	userExists(aliceById);

	console.log("\n3.2: User NO existe");
	const notExistById = await userRepo.findById(Utils.generateUserId());  // ✅ UUID válido
	userExists(notExistById);

	// ============================================================================
	// TEST 4: findByUsername
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 4: findByUsername ---");
	console.log("#".repeat(40) + "\n");

	console.log("4.1: User existe - Alice");
	const aliceByUsername = await userRepo.findByUsername(alice.username);
	userExists(aliceByUsername);

	console.log("\n4.2: User NO existe");
	const notExistByUsername = await userRepo.findByUsername("NoExiste");
	userExists(notExistByUsername);

	// ============================================================================
	// TEST 5: updatePassword & setOnlineStatus
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 5: updatePassword & setOnlineStatus ---");
	console.log("#".repeat(40) + "\n");

	if (!aliceByEmail) {
		console.error("❌ aliceByEmail no existe");
		process.exit(1);
	}
	
	console.log("Password inicial:", aliceByEmail.passwordHash);
	console.log("Online inicial:", aliceByEmail.isOnline);

	// ✅ updatePassword ahora funciona (bug corregido)
	await userRepo.updatePassword(aliceByEmail.id, `NewHash_${Date.now()}`);
	console.log("✅ Password actualizado");

	await userRepo.setOnlineStatus(aliceByEmail.id, !aliceByEmail.isOnline);
	console.log("✅ Status online cambiado");

	const updatedAlice = await userRepo.findByEmail(TestConstants.TEST_USERS.user1.email);
	console.log("Password nuevo:", updatedAlice?.passwordHash);
	console.log("Online nuevo:", updatedAlice?.isOnline);

	// ============================================================================
	// TEST 6: Validations (case-insensitive)
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 6: Validations ---");
	console.log("#".repeat(40) + "\n");

	const testEmail = TestConstants.TEST_USERS.user1.email;
	const testUsername = TestConstants.TEST_USERS.user1.username;

	console.log(`isEmailTaken('${testEmail}'): ${await userRepo.isEmailTaken(testEmail)}`);
	console.log(`isEmailTaken('noexiste@test.com'): ${await userRepo.isEmailTaken('noexiste@test.com')}`);
	console.log(`isEmailTaken('${testEmail.toUpperCase()}'): ${await userRepo.isEmailTaken(testEmail.toUpperCase())}`);

	console.log(`\nisUsernameTaken('${testUsername}'): ${await userRepo.isUsernameTaken(testUsername)}`);
	console.log(`isUsernameTaken('NoExiste'): ${await userRepo.isUsernameTaken('NoExiste')}`);
	console.log(`isUsernameTaken('${testUsername.toUpperCase()}'): ${await userRepo.isUsernameTaken(testUsername.toUpperCase())}`);

	// ============================================================================
	// TEST 7: anonymize usando TestConstants.TEST_USERS.user2
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 7: anonymize ---");
	console.log("#".repeat(40) + "\n");

	let pepe: UserTypes.UserPublic | null = null;

	// ✅ Usar datos de TestConstants
	const testUser2 = TestConstants.TEST_USERS.user2;

	const createUserData2: UserTypes.CreateUserBody & { id: string } = {
		id: Utils.generateUserId(),  // ✅ GENERAR ID
		username: testUser2.username,
		email: testUser2.email,
		passwordHash: `Hashed_${testUser2.password}`,
		avatar: testUser2.avatar,
		isOnline: false,
		isDeleted: false,
		has2FAEnabled: false
	};
	
	let pepeUsernameTaken: boolean | null = null;

	pepeUsernameTaken = await userRepo.isUsernameTaken(testUser2.username);
	console.log(`Antes de crear ${testUser2.username}, username ${pepeUsernameTaken ? 'NO' : 'SI'} está disponible`);
	
	pepe = await userRepo.create(createUserData2);
	await userRepo.setOnlineStatus(pepe?.id as string, true);
	pepe = await userRepo.findById(pepe?.id as string);
	console.log("\n✅ User2 creado correctamente:", pepe);

	pepeUsernameTaken = await userRepo.isUsernameTaken(testUser2.username);
	console.log(`\nDespués de crear, username ${pepe?.username} ${pepeUsernameTaken ? 'NO' : 'SI'} está disponible`);
	
	console.log('\nAnonimizando user2...\n');
	pepe = await userRepo.anonymize(pepe?.id as string);
	
	pepeUsernameTaken = await userRepo.isUsernameTaken(testUser2.username);
	console.log(`Después de anonimizar, username original ${testUser2.username} ${pepeUsernameTaken ? 'NO' : 'SI'} está disponible`);
	
	pepeUsernameTaken = await userRepo.isUsernameTaken(pepe?.username as string);
	console.log(`Después de anonimizar, username anonimizado ${pepe?.username} ${pepeUsernameTaken ? 'NO' : 'SI'} está disponible`);
	console.log('Nota: usuarios anonimizados son invisibles');

	if (pepe) {
		console.log('\n✅ Anonymized user2:', pepe);
	} else {
		console.error('❌ Error anonimizando user2');
		process.exit(127);
	}

	// ============================================================================
	// TEST 8: update usando TestConstants.TEST_USERS.user3
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- TEST 8: update ---");
	console.log("#".repeat(40) + "\n");

	// ✅ Crear user3 para probar update
	const testUser3 = TestConstants.TEST_USERS.user3;
	
	const createUserData3: UserTypes.CreateUserBody & { id: string } = {
		id: Utils.generateUserId(),
		username: testUser3.username,
		email: testUser3.email,
		passwordHash: `Hashed_${testUser3.password}`,
		avatar: testUser3.avatar,
		isOnline: false,
		isDeleted: false,
		has2FAEnabled: false
	};

	let user3 = await userRepo.create(createUserData3);
	console.log("✅ User3 creado:", user3.username);

	// Actualizar username
	const updateData: UserTypes.UpdateUserBody = {
		username: "foo_updated_test"
	};

	user3 = await userRepo.update(user3.id, updateData) as UserTypes.UserPublic;
	console.log("✅ Username actualizado:", user3.username);

	// ============================================================================
	// CLEANUP
	// ============================================================================
	console.log("\n" + "#".repeat(40));
	console.log("--- CLEANUP ---");
	console.log("#".repeat(40) + "\n");

	await userRepo.delete(alice.id);
	if (pepe) await userRepo.delete(pepe.id);
	await userRepo.delete(user3.id);

	console.log("✅ Usuarios de prueba eliminados");
	console.log("\n=== TEST COMPLETADO ===\n");
	
	closeDatabase();
}

testUserRepository();
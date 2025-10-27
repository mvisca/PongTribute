// ============================================================================
// TEST MATCH REPOSITORY
// packages/database/test/test-match-repository.ts
// ============================================================================

import * as SharedTypes from "../../shared/src";
import { SQLiteMatchRepository } from "../repositories/SQLiteMatchRepository";
import { SQLiteUserRepository } from "../repositories/SQLiteUserRepository";

import { getDatabase } from "../connection";
import { MatchMapper } from "../mappers/MatchMapper";
import { MockPropertyContext } from "node:test";

// ============================================================================
// CREAR USUARIOS
// ============================================================================

function showScore(
	match: SharedTypes.Match, p1: SharedTypes.UserId, p2: SharedTypes.UserId
): void {
	let p1Complete = MatchMapper.findPlayerInMatch(match, p1);
	let p2Complete = MatchMapper.findPlayerInMatch(match, p2);
	console.log("=== SCORE UPDATE ===");
	console.log(`${p2Complete.playerSlot}: ${p1Complete.playerPosition} : ${p1Complete.score}`);
	console.log(`${p2Complete.playerSlot}: ${p2Complete.playerPosition} : ${p2Complete.score}`);
}

async function testMatchRepository() {

	console.log('=== TEST MATCH REPOSITORY ===');
	
	const db = getDatabase();
	db.exec("DELETE FROM matches");
	db.exec("DELETE FROM match_players");
	db.exec("DELETE FROM friendships");
	db.exec("DELETE FROM users");

	const userRepo = new SQLiteUserRepository(db);
	const matchRepo = new SQLiteMatchRepository(db);

	// ============================================================================
	// CREAR USUARIOS
	// ============================================================================

	console.log('Creando Usuarios');
	const toto = await userRepo.create({
		username: "toto",
		email: "toto@tita.com" as SharedTypes.Email,
		passwordHash: "passwordraw",
		avatar: "url/picture" 
	});

	const pepe = await userRepo.create({
		username: "pepe",
		email: "pepe@pepe.com" as SharedTypes.Email,
		passwordHash: "passwordraw",
		avatar: "image/path"
	});

	const tita = await userRepo.create({
		username: "tita",
		email: "tita@tita.com" as SharedTypes.Email,
		passwordHash: "passwordraw",
		avatar: "otra/image"
	});

	console.log("\n=== CREAR USERS ===");
	console.log(`Usuario 1 creado: ${toto.username} [${toto.id}]`);
	console.log(`Usuario 2 creado: ${pepe.username} [${pepe.id}]`);
	console.log(`Usuario 3 creado: ${tita.username} [${tita.id}]`);

	// ============================================================================
	// CREAR MATCH
	// ============================================================================

	console.log("\n=== CREAR MATCHES ===");

	// === MATCH 1
	// Create MatchPlayers
	console.log('Match 1 === pepe toto');
	const pepeVsTotoData: SharedTypes.CreateMatchData = MatchMapper
		.cretateMatchPlayers(pepe.id, toto.id);
	console.log(`Players creados: `, pepeVsTotoData);
	// Create Match 2
	const pepeVsToto = await matchRepo.create(pepeVsTotoData);
	console.log(`Match created ('pepe' vs 'toto')`, pepeVsToto);

	// === MATCH 2
	// Create MatchPlayers
	console.log('Match 2 === toto tita');
	const totoVsTitaData: SharedTypes.CreateMatchData = MatchMapper
		.cretateMatchPlayers(toto.id, tita.id);
	console.log(`Players creados: `, totoVsTitaData);
	// Create Match 2
	let totoVsTita = await matchRepo.create(totoVsTitaData);
	console.log(`Match created: `, totoVsTita);
	// Update Score toto
	console.log('Match 2 === toto scores');
	matchRepo.updateScore(totoVsTita.id, toto.id, 1);
	totoVsTita = await matchRepo.findById(totoVsTita.id);
	showScore(totoVsTita, toto.id, tita.id)
	// Update socre tita
	console.log('Match 2 === tita scores');
	let titaPlayer = MatchMapper.findPlayerInMatch(totoVsTita, tita.id);
	await matchRepo.updateScore(totoVsTita.id, tita.id, titaPlayer.score + 1);
	totoVsTita = await matchRepo.findById(totoVsTita.id);
	showScore(totoVsTita, toto.id, tita.id)
	// Update score tita
	console.log('Match 2 === tita scores');
	titaPlayer = MatchMapper.findPlayerInMatch(totoVsTita, tita.id);
	await matchRepo.updateScore(totoVsTita.id, tita.id, titaPlayer.score + 1);
	totoVsTita = await matchRepo.findById(totoVsTita.id);
	showScore(totoVsTita, toto.id, tita.id);

	// Terminar el partido (pasar el id, no el objeto)
	totoVsTita = await matchRepo.finish(totoVsTita.id);

	console.log(`Partida terminada: `, totoVsTita);

	// MATCH 3
	console.log('Match 3 === tita pepe');
	const titaVsPepeData = await MatchMapper.cretateMatchPlayers(tita.id, pepe.id);
	let titaVsPepe = await matchRepo.create(titaVsPepeData);
	await matchRepo.updateScore(titaVsPepe.id, tita.id, 1);
	await matchRepo.updateScore(titaVsPepe.id, pepe.id, 1);
	await matchRepo.finish(titaVsPepe.id);
	titaVsPepe = await matchRepo.findById(titaVsPepe.id);
	console.log(`Partida terminada: `, titaVsPepe);

}

testMatchRepository();
/* PEPE TOTO TITA
Crear match1 (Alice vs Bob):
  - Player1: Alice, slot=Player1, position=left, score=0
  - Player2: Bob, slot=Player2, position=right, score=0

Verificar:
  ✓ Match tiene ID
  ✓ status = "active"
  ✓ winnerId = null
  ✓ 2 jugadores
  ✓ scores = 0, 0

// ============================================================================
// TEST 2: FIND BY ID
// ============================================================================

Buscar match1 por ID → debe existir
Buscar "fake-id" → debe retornar null

// ============================================================================
// TEST 3: FIND BY USER
// ============================================================================

Crear match2 (Alice vs Charlie)
Crear match3 (Bob vs Charlie)

Buscar matches de Alice → debe retornar 2 (match1, match2)
Buscar matches de Charlie → debe retornar 2 (match2, match3)
Buscar matches de Bob → debe retornar 2 (match1, match3)

Verificar orden cronológico descendente

// ============================================================================
// TEST 4: FIND ACTIVE
// ============================================================================

Buscar todas las activas → debe retornar 3 (match1, match2, match3)

Verificar que todas tienen:
  ✓ status = "active"
  ✓ winnerId = null

// ============================================================================
// TEST 5: UPDATE SCORE
// ============================================================================

En match1:
  - Actualizar score de Alice a 3
  - Actualizar score de Bob a 2

Buscar match1 de nuevo
Verificar scores actualizados (3, 2)

// ============================================================================
// TEST 6: FINISH MATCH
// ============================================================================

Finalizar match1:
  - winnerId = Alice
  - scores finales: Alice=5, Bob=3

Verificar:
  ✓ status = "finished"
  ✓ winnerId = Alice.id
  ✓ scores = 5, 3

// ============================================================================
// TEST 7: FIND FINISHED BY USER
// ============================================================================

Finalizar match2 (ganador: Charlie)

Buscar finished de Alice → debe retornar 2 (match1, match2)
Buscar finished de Bob → debe retornar 1 (match1)
Buscar finished de Charlie → debe retornar 1 (match2)

// ============================================================================
// TEST 8: FIND ACTIVE DESPUÉS DE FINISH
// ============================================================================

Buscar activas → debe retornar 1 (solo match3)

// ============================================================================
// TEST 9: ERRORES ESPERADOS
// ============================================================================

Intentar finalizar match1 de nuevo → debe fallar (ya finished)
Intentar finalizar "fake-id" → debe fallar (no existe)

// ============================================================================
// TEST 10: DELETE
// ============================================================================

Eliminar match3

Verificar:
  ✓ match3 no existe (findById retorna null)
  ✓ Bob ahora tiene solo 1 match (CASCADE eliminó participant)

// ============================================================================
// TEST 11: EDGE CASES
// ============================================================================

Crear usuario nuevo (sin matches)

Buscar matches → retorna array vacío
Buscar finished → retorna array vacío

// ============================================================================
// CLEANUP
// ============================================================================

Limpiar todas las tablas
Cerrar DB
Mostrar "TEST COMPLETO"

FIN TEST
*/

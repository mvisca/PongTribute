// ============================================================================
// TEST FRIENDSHIP REPOSITORY
// ============================================================================

import { FRIENDSHIP_STATUS } from "../../shared/src";
import { SQLiteFriendshipRepository } from "../src/repositories/SQLiteFriendshipRepository";
import { SQLiteUserRepository } from "../src/repositories/SQLiteUserRepository";
import { getDatabase } from "../src/connection";

async function testFriendshipRepository() {
  console.log("=== TEST FRIENDSHIP REPOSITORY ===\n");

  const db = getDatabase();
  db.exec("DELETE FROM friendships"); FRIEN
  db.exec("DELETE FROM users");

  const userRepo = new SQLiteUserRepository(db);
  const friendRepo = new SQLiteFriendshipRepository(db);

  // ============================================================================
  // CREAR USUARIOS
  // ============================================================================
  console.log("\n--- CREAR USERS ---");

  const ana = await userRepo.create({
    username: "Ana",
    email: "aNa@test.com" as Email,
    passwordHash: "sdieuwekwnsdf",
    avatar: "antoher.com/image",
  });

  const beto = await userRepo.create({
    username: "beto",
    email: "beto@test.com" as Email,
    passwordHash: "jñksdlfaksdjf",
    avatar: "myimage.com/image",
  });

  const coco = await userRepo.create({
    username: "coco",
    email: "coco@test.com" as Email,
    passwordHash: "sdklfjasfkdjfajkdfs",
    avatar: "more.com/images",
  });

  console.log(`ana: ${ana.id}`);
  console.log(`beto: ${beto.id}`);
  console.log(`coco: ${coco.id}\n`);

  // ============================================================================
  // CREAR RELACIONES
  // ============================================================================
  console.log("--- CREAR FRIENDSHIPS ---");

  const abPending = await friendRepo.create({
    userId: ana.id,
    friendId: beto.id,
    status: FRIENDSHIP_STATUS.PENDING,
  });
  console.log(`A-B: ${abPending.status}`);

  const acAccepted = await friendRepo.create({
    userId: ana.id,
    friendId: coco.id,
    status: FRIENDSHIP_STATUS.ACCEPTED,
  });
  console.log(`A-C: ${acAccepted.status}\n`);

  // ============================================================================
  // TEST 1: Buscar todas para Ana
  // ============================================================================
  console.log("--- TEST 1: findByUser(ana) ---");
  const anaFriends = await friendRepo.findByUser(ana.id);
  console.log(`Total: ${anaFriends.length}`);
  anaFriends.forEach((f) =>
    console.log(` - ${f.userId} ↔ ${f.friendId}: ${f.status}`)
  );

  // ============================================================================
  // TEST 2: Buscar relaciones específicas
  // ============================================================================
  console.log("\n--- TEST 2: findByUserAndFriend ---");
  const ab = await friendRepo.findByUserAndFriend(ana.id, beto.id);
  console.log(`A-B: ${ab ? ab.status : "null"}`);

  const bc = await friendRepo.findByUserAndFriend(beto.id, coco.id);
  console.log(`B-C: ${bc ? bc.status : "null"}`);

  // ============================================================================
  // TEST 3: Aceptar A-B
  // ============================================================================
  console.log("\n--- TEST 3: update A-B → accepted ---");
  const updating = new Date();
  await friendRepo.update({
    userId: ana.id,
    friendId: beto.id,
    status: FRIENDSHIP_STATUS.ACCEPTED,
    updatedAt: updating,
  });
  const abUpdated = await friendRepo.findByUserAndFriend(ana.id, beto.id);
  console.log(`A-B actualizado: ${abUpdated?.status}`);

  // ============================================================================
  // TEST 4: Buscar accepted para Ana
  // ============================================================================
  console.log("\n--- TEST 4: findByUserAndStatus(ana, accepted) ---");
  const anaAccepted = await friendRepo.findByUserAndStatus(
    ana.id,
    FRIENDSHIP_STATUS.ACCEPTED
  );
  console.log(`Total accepted: ${anaAccepted.length}`);
  anaAccepted.forEach((f) =>
    console.log(` - ${f.userId} ↔ ${f.friendId}`)
  );

  // ============================================================================
  // TEST 5: Borrar A-B
  // ============================================================================
  console.log("\n--- TEST 5: delete A-B ---");
  await friendRepo.delete(ana.id, beto.id);
  const abDeleted = await friendRepo.findByUserAndFriend(ana.id, beto.id);
  console.log(`A-B después delete: ${abDeleted ? "existe" : "null"}`);

  // ============================================================================
  // TEST 6: Crear B-C
  // ============================================================================
  console.log("\n--- TEST 6: create B-C ---");
  const showFriendship = await friendRepo.create({
    userId: beto.id,
    friendId: coco.id,
    status: FRIENDSHIP_STATUS.PENDING,
  });
  console.log("Show friendship: ", showFriendship);
  const bcPending = await friendRepo.findByUserAndFriend(beto.id, coco.id);
  console.log(`B-C ${bcPending?.status}`);

  // ============================================================================
  // TEST 7: Listar todas para Beto
  // ============================================================================
  console.log("\n--- TEST 7: findByUser(beto) ---");
  const betoFriends = await friendRepo.findByUser(beto.id);
  console.log(`Total: ${betoFriends.length}`);
  betoFriends.forEach((f) =>
    console.log(` - ${f.userId} ↔ ${f.friendId}: ${f.status}`)
  );

  // ============================================================================
  // TEST 8: Bidireccionalidad
  // ============================================================================
  console.log("\n--- TEST 8: Bidireccionalidad ---");
  const cbInverted = await friendRepo.findByUserAndFriend(coco.id, beto.id);
  console.log(`C-B (invertido): ${cbInverted ? cbInverted.status : "null"}`);

  // ============================================================================
  // TEST 9: Edge cases
  // ============================================================================
  console.log("\n--- TEST 9: Edge cases ---");
  const noFriends = await friendRepo.findByUser(coco.id);
  console.log(`coco amigos: ${noFriends.length}`);

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

testFriendshipRepository();

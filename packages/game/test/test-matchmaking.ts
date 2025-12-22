//TESTEA QUE SE CREA UNA PARTIDA O SE UNE A UNA CREADA (2 clientes)
//PERO LOS TOKENS SON FALSOS NO ESTAN EN LA DB.
//Para correr el test desde la raiz: npx tsx packages/game/test/test-matchmaking.ts

import { buildApp } from '../src/app';
import jwt from 'jsonwebtoken';
import { GameEnv } from '../src/config';
import { MatchTypes } from '@transcendence/shared';

// Función auxiliar para generar tokens de prueba
function signToken(id: string, username: string) {
    return jwt.sign(
        { id, username, email: `${username}@test.com` },
        GameEnv.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function testMatchmaking() {
    console.log('\n🥊 INICIANDO TEST DE MATCHMAKING (REDIS QUEUE)\n');

    // 1. Levantamos la app en memoria
    const app = buildApp(); 
    await app.ready();

    // 2. Preparamos 2 Jugadores (OJO, dado creo token falsos para que funcione,
	//  pero no estan en la base de datos y el matchId sera con username "unknown" )
    const player1 = { id: 'user-1111', name: 'Goku', token: signToken('user-1111', 'Goku') };
    const player2 = { id: 'user-2222', name: 'Vegeta', token: signToken('user-2222', 'Vegeta') };

    console.log(`🔹 Jugador 1: ${player1.name} (${player1.id})`);
    console.log(`🔹 Jugador 2: ${player2.name} (${player2.id})\n`);

    // ========================================================================
    // CASO A: JUGADOR 1 ENTRA A LA COLA (Primer jugador)
    // ========================================================================
    console.log('👉 Paso 1: Goku busca partida pública...');
    
    const res1 = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${player1.token}` },
        payload: { matchType: 'public' } // <--- Payload v2 Correcto
    });

    const body1 = res1.json<any>();
    console.log(`   Status: ${res1.statusCode} (Esperado: 200)`);

    // Validamos que Goku fue añadido a la cola, NO que se creó una partida
    if (res1.statusCode === 200 && body1.outcome === 'added_to_queue') {
        console.log(`   ✅ ÉXITO: Goku añadido a la cola de espera.`);
    } else {
        console.error('   ❌ ERROR: Respuesta inesperada para Goku:', body1);
        process.exit(1);
    }

    // ========================================================================
    // CASO B: JUGADOR 2 ENTRA A LA COLA (Hace match con Goku)
    // ========================================================================
    console.log('\n👉 Paso 2: Vegeta busca partida pública...');
    
    const res2 = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${player2.token}` },
        payload: { matchType: 'public' } // <--- Payload v2 Correcto
    });

    const match2 = res2.json<MatchTypes.Match>();
    console.log(`   Status: ${res2.statusCode} (Esperado: 201)`);

    // Validaciones clave del Match encontrado
    const isActive = match2.status === 'active';
    const isGokuP1 = match2.player1.userId === player1.id;
    const isVegetaP2 = match2.player2?.userId === player2.id;

    if (res2.statusCode === 201 && isActive && isGokuP1 && isVegetaP2) {
        console.log(`   ✅ ÉXITO: ¡Matchmaking funcionó!`);
        console.log(`   Match ID: ${match2.id}`);
        console.log(`   Estado: ${match2.status}`);
        console.log(`   Versus: ${match2.player1.username} VS ${match2.player2?.username}`);
    } else {
        console.error('   ❌ ERROR: No se unió correctamente o datos incorrectos.');
        console.log('Recibido:', JSON.stringify(match2, null, 2));
        process.exit(1);
    }

    console.log('\n🎉 TEST FINALIZADO CORRECTAMENTE');
	await app.close();  // Intenta cerrar
	
	// FORZAR SALIDA (Mata cualquier conexión pendiente: Redis, Timers, DB)
    process.exit(0);
}

testMatchmaking();
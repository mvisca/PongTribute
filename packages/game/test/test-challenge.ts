//Ejecutar desde raiz: pnpm --filter @transcendence/game exec tsx test/test-matchmaking.ts
/**
 * TEST DE INTEGRACIÓN: MATCHMAKING PRIVADO (Direct Challenge)
 * * Objetivo: Validar la creación directa de partidas sabiendo el ID del oponente.
 * Escenario:
 * 1. Validación de Errores: Intentar desafiarse a uno mismo (debe dar 400).
 * 2. Flujo Exitoso: Goku desafía a Vegeta con IDs válidos -> Crea partida inmediata.
 * * Valida: Lógica de negocio (reglas de desafío), manejo de errores HTTP y creación en DB.
 */
import { buildApp } from '../src/app';
import jwt from 'jsonwebtoken';
import { GameEnv } from '../src/config';
import { MatchTypes } from '@transcendence/shared';
import { randomUUID } from 'crypto'; // Usamos el generador nativo de Node

function signToken(id: string, username: string) {
    return jwt.sign(
        { id, username, email: `${username}@test.com` },
        GameEnv.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function testChallenge() {
    console.log('\n🥊 INICIANDO TEST DE DESAFÍO PRIVADO (DIRECTO)\n');

    const app = buildApp();
    await app.ready();

    // 1. Generamos IDs válidos (UUID v4) para pasar el Schema Validation
    const gokuId = randomUUID();
    const vegetaId = randomUUID();

	//Creamos los datos de los clientes
    const goku = { id: gokuId, name: 'Goku', token: signToken(gokuId, 'Goku') };
    const vegeta = { id: vegetaId, name: 'Vegeta', token: signToken(vegetaId, 'Vegeta') };

    console.log(`🔹 Retador: ${goku.name} (${goku.id})`);
    console.log(`🔹 Oponente: ${vegeta.name} (${vegeta.id})\n`);

    // ========================================================================
    // CASO A: INTENTO DE AUTO-DESAFÍO (Lógica de Negocio)
    // ========================================================================
    console.log('👉 Paso 1: Goku intenta desafiarse a sí mismo...');
    
    const resFail = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${goku.token}` },
        payload: { 
            matchType: 'private', 
            opponentId: goku.id // <--- El mismo ID
        }
    });

    const bodyFail = resFail.json<any>();
    // Esperamos 400 Bad Request
    if (resFail.statusCode === 400) {
        // Verificamos que sea NUESTRO error, no el de Schema
        if (bodyFail.message?.includes('cannot play against yourself') || bodyFail.error === 'Bad Request') {
             console.log(`   ✅ CORRECTO: El servidor rechazó el auto-desafío.`);
        } else {
             console.log(`   ⚠️ OJO: Status 400 correcto, pero mensaje inesperado: ${JSON.stringify(bodyFail)}`);
        }
    } else {
        console.error(`   ❌ FALLO: Se esperaba 400, recibido ${resFail.statusCode}`);
        console.log(bodyFail);
        process.exit(1);
    }

    // ========================================================================
    // CASO B: DESAFÍO REAL (Goku vs Vegeta)
    // ========================================================================
    console.log('\n👉 Paso 2: Goku desafía a Vegeta...');
    
    const resSuccess = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${goku.token}` },
        payload: { 
            matchType: 'private', 
            opponentId: vegeta.id // <--- ID Diferente y válido
        } 
    });

    const match = resSuccess.json<MatchTypes.Match>();

    if (resSuccess.statusCode === 201 && match.id) {
        console.log(`   ✅ ÉXITO: Partida Privada creada.`);
        console.log(`   Match ID: ${match.id}`);
        console.log(`   P1: ${match.player1.userId} vs P2: ${match.player2?.userId}`);
    } else {
        console.error(`   ❌ FALLO: No se creó la partida.`);
        console.log(JSON.stringify(match, null, 2));
        process.exit(1);
    }

    console.log('\n🎉 TEST DE DESAFÍO FINALIZADO');
    await app.close();
    process.exit(0);
}

testChallenge();
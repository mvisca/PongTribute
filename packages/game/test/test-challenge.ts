//TESTEA QUE SE ADMITE O RECHAZA CORRECTAMENTE UN OPONENTE (FRIEND)
//Para correr el test desde raiz: npx tsx packages/game/test/test-challenge.ts

import { buildApp } from '../src/app';
import jwt from 'jsonwebtoken';
import { GameEnv } from '../src/config';
import { MatchTypes } from '@transcendence/shared';

// Helper para firmar tokens falsos pero válidos para nuestro backend
function signToken(id: string, username: string) {
    return jwt.sign(
        { id, username, email: `${username}@test.com` },
        GameEnv.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function testChallenge() {
    console.log('\n🥊 INICIANDO TEST DE DESAFÍO PRIVADO (DIRECTO)\n');
    
    // 1. Instanciar App
    const app = buildApp();
    await app.ready();

    // 2. Actores
    const goku = { id: 'user-1111', name: 'Goku', token: signToken('user-1111', 'Goku') };
    const vegeta = { id: 'user-2222', name: 'Vegeta', token: signToken('user-2222', 'Vegeta') };

    console.log(`🔹 Retador: ${goku.name} (${goku.id})`);
    console.log(`🔹 Oponente: ${vegeta.name} (${vegeta.id})\n`);

    // ========================================================================
    // CASO A: INTENTO DE AUTO-DESAFÍO (Debe fallar)
    // ========================================================================
    console.log('👉 Paso 1: Goku intenta desafiarse a sí mismo...');
    
    const resFail = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${goku.token}` },
        payload: { opponentId: goku.id } // <--- EL ERROR
    });

    
    // (Esperamos un status 400 con el mensaje que pusimos en el servicio
    if (resFail.statusCode === 400 && resFail.body.includes("No puedes desafiarte")) {
        console.log('   Status Recibido:', resFail.statusCode, '(Esperado: 400)');
		console.log(`   ✅ ÉXITO: El servidor rechazó el auto-desafío correctamente (400).`);
        console.log(`   Mensaje: "${JSON.parse(resFail.body).message}"\n`);
    } else {
        console.error('   ❌ FALLO: El servidor debió rechazar esto.');
        console.log('   Status Recibido:', resFail.statusCode, '(Esperado: 400)');
        console.log('   Body:', resFail.body);
        process.exit(1);
    }

    // ========================================================================
    // CASO B: DESAFÍO REAL (Goku vs Vegeta)
    // ========================================================================
    console.log('👉 Paso 2: Goku desafía a Vegeta...');

    const resSuccess = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${goku.token}` },
        payload: { opponentId: vegeta.id } // <--- CORRECTO
    });

    const match = resSuccess.json<MatchTypes.Match>();
    
    console.log(`   Status: ${resSuccess.statusCode} (Esperado: 201)`);

    // VERIFICACIONES CLAVE:
    // 1. Status debe ser pending (esperando que Vegeta acepte/juegue, aunque la mesa ya está reservada)
    // 2. Player 1 debe ser Goku.
    // 3. Player 2 debe ser Vegeta (¡Ya no es null!).

    const p1Ok = match.player1.userId === goku.id;
    const p2Ok = match.player2?.userId === vegeta.id;
    const isPending = match.status === 'pending';

    if (p1Ok && p2Ok && isPending) {
        console.log(`   ✅ ÉXITO: Partida Privada Creada.`);
        console.log(`   ID Partida: ${match.id}`);
        console.log(`   Jugadores: ${match.player1.userId} VS ${match.player2?.userId}`);
    } else {
        console.error('   ❌ FALLO: La partida no se creó correctamente.');
        console.log('   JSON:', JSON.stringify(match, null, 2));
        process.exit(1);
    }

    console.log('\n🎉 TEST PRIVADO FINALIZADO CORRECTAMENTE');
    await app.close();
}

testChallenge();
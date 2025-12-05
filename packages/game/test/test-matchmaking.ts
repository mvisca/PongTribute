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
    console.log('\n🥊 INICIANDO TEST DE MATCHMAKING (FIFO)\n');
    
	// 1. Levantamos la app (sin escuchar puerto real, solo en memoria)
	// Usamos app porque aun no tenemos el navegador listo para probarlo.
    const app = buildApp(); // Levanta la instancia de Fastify en memoria
    await app.ready(); // espera a que odos los plugins esten cargados

    // 2. Preparamos 2 Jugadores
    const player1 = { id: 'user-1111', name: 'Goku', token: signToken('user-1111', 'Goku') };
    const player2 = { id: 'user-2222', name: 'Vegeta', token: signToken('user-2222', 'Vegeta') };

    console.log(`\n🔹 Jugador 1: ${player1.name} (${player1.id})`);
    console.log(`🔹 Jugador 2: ${player2.name} (${player2.id})\n`);

    // ========================================================================
    // CASO A: JUGADOR 1 BUSCA PARTIDA (Crea nueva)
    // ========================================================================
    console.log('👉 Paso 1: Goku busca partida...');
    const res1 = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${player1.token}` },
        payload: {} // Matchmaking público (vacio = busca cualquier partida)
    });

    console.log(`   Status: ${res1.statusCode} (Esperado: 201)`);
    const match1 = res1.json<MatchTypes.Match>();
    
    if (match1.status === 'pending' && match1.player1.userId === player1.id) {
        console.log(`   ✅ ÉXITO: Partida creada. ID: ${match1.id}`);
        console.log(`   Estado: ${match1.status} | P1: ${match1.player1.username} | P2: ${match1.player2 ?? 'Nadie'}`);
    } else {
        console.error('   ❌ ERROR:', match1);
        process.exit(1);
    }

    // ========================================================================
    // CASO B: JUGADOR 2 BUSCA PARTIDA (Se une a la de Goku)
    // ========================================================================
    console.log('\n👉 Paso 2: Vegeta busca partida...');
    const res2 = await app.inject({
        method: 'POST',
        url: '/api/matches',
        headers: { Authorization: `Bearer ${player2.token}` },
        payload: {}
    });

    console.log(`   Status: ${res2.statusCode} (Esperado: 201)`);
    const match2 = res2.json<MatchTypes.Match>();

    // Validaciones clave
    const isSameMatch = match2.id === match1.id;
    const isNowActive = match2.status === 'active';
    const hasPlayer2 = match2.player2?.userId === player2.id;

    if (isSameMatch && isNowActive && hasPlayer2) {
        console.log(`   ✅ ÉXITO: ¡Matchmaking funcionó!`);
        console.log(`   Match ID: ${match2.id}`);
        console.log(`   Estado: ${match2.status}`);
        console.log(`   Versus: ${match2.player1.userId} VS ${match2.player2?.userId}`);
    } else {
        console.error('   ❌ ERROR: No se unió correctamente.');
        console.log('Recibido:', JSON.stringify(match2, null, 2));
        process.exit(1);
    }

    console.log('\n🎉 TEST FINALIZADO CORRECTAMENTE');
    await app.close();
}

testMatchmaking();
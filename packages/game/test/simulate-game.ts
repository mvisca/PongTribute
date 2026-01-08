// packages/game/test/simulate-game.ts

//Arrancar el test con: 
// pnpm --filter @transcendence/game exec tsx test/simulate-game.ts


import { randomUUID } from 'crypto';
import WebSocket from 'ws';

// CONFIGURACIÓN (Ajusta si tus puertos son distintos)
const AUTH_URL = 'http://localhost:3002/api/auth';
const GAME_HTTP_URL = 'http://localhost:3003/api/matches';
const GAME_WS_URL = 'ws://localhost:3003/api/game/ws';

// ==========================================
// 1. HELPER: AUTH (Login/Register Real)
// ==========================================
async function getAuthToken(alias: string): Promise<string> {
    const username = `${alias}_${randomUUID().substring(0, 4)}`;
    const email = `${username}@test.com`;
    const password = 'Password123!';

    console.log(`👤 Registrando user: ${username}...`);
    
    // Register
    await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, avatar: 'http://fake.url' })
    });

    // Login
    const loginRes = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await loginRes.json() as any;
    if (!data.token && !data.accessToken) throw new Error(`No token for ${alias}`);
    return data.token || data.accessToken;
}

// ==========================================
// 2. HELPER: MATCHMAKING
// ==========================================
async function findMatch(token: string): Promise<any> {
    const res = await fetch(GAME_HTTP_URL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchType: 'public' })
    });
    return await res.json();
}

// ==========================================
// 3. MAIN SCRIPT
// ==========================================
// packages/game/test/simulate-game.ts

// ... imports y helpers anteriores se mantienen igual ...

async function runSimulation() {
    try {
        console.log('🔥 INICIANDO SIMULACIÓN DE JUEGO (HEADLESS) 🔥');

        // A. Obtener Tokens
        const tokenP1 = await getAuthToken('Player1');
        const tokenP2 = await getAuthToken('Player2');

        // B. Matchmaking
        console.log('\n🔍 Buscando partida...');
        
        // P1 entra a cola
        const p1Res = await findMatch(tokenP1); 
        console.log(`   P1 Estado: ${p1Res.outcome || 'Entrando...'}`); // Debería ser 'added_to_queue'

        // P2 hace match
        // CORRECCIÓN: Tu API devuelve el objeto Match directamente (HTTP 201) si encuentra partida
        const matchRes = await findMatch(tokenP2); 
        
        // Verificamos si tenemos un ID, lo que significa que es un Match
        if (!matchRes.id) {
            console.error('Respuesta inesperada P2:', matchRes);
            throw new Error('No se recibió un Match ID. Reinicia Redis si es necesario.');
        }

        const matchId = matchRes.id;
        console.log(`✅ MATCH ENCONTRADO ID: ${matchId}`);

        // C. Conectar WebSockets
        console.log(`\n🔌 Conectando WS a: ${GAME_WS_URL}`);
        const ws1 = new WebSocket(`${GAME_WS_URL}?token=${tokenP1}&matchId=${matchId}`);
        const ws2 = new WebSocket(`${GAME_WS_URL}?token=${tokenP2}&matchId=${matchId}`);

        // D. Lógica de Cliente (Escuchar y Moverse)
        const setupClient = (ws: WebSocket, name: string) => {
            ws.on('open', () => console.log(`   ✨ ${name} socket abierto`));
            
            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                
                // Confirmación de unión
                if (msg.event === 'JOINED_MATCH') {
                    console.log(`   🚀 ${name} UNIDO A SALA!`);
                }

                // Imprimimos solo actualizaciones de juego para ver la física
                if (msg.event === 'GAME_UPDATE') {
                    const b = msg.data.ball;
                    const p1 = msg.data.player1;
                    const p2 = msg.data.player2;
                    
                    // Logueamos en una sola línea usando process.stdout.write
                    process.stdout.write(`\r⚽ [${matchId.substring(0,4)}] Ball: (${b.x.toFixed(0)}, ${b.y.toFixed(0)}) | P1: ${p1.score} | P2: ${p2.score}`);
                }

                if (msg.event === 'GAME_OVER') {
					console.log(`\n\n🏆 JUEGO TERMINADO: ${msg.data.reason}`);
					console.log('\n🎉 TEST FINALIZADO CON ÉXITO: Flujo Completo Validado.');
					console.log('========================================================');
                    process.exit(0);
                }
            });

            ws.on('error', (err) => console.error(`❌ Error WS ${name}:`, err.message));
            ws.on('close', (code, reason) => console.log(`🔌 ${name} cerrado: ${code}`));
        };

        setupClient(ws1, 'P1');
        setupClient(ws2, 'P2');

        // E. Simular Inputs (IA Tonta)
        console.log('\n🎮 Iniciando inputs automáticos (Presiona Ctrl+C para salir)...');
        setInterval(() => {
            // Validamos que el socket esté abierto antes de enviar
            if (ws1.readyState === WebSocket.OPEN) {
                const move = Math.random() > 0.5 ? 'MOVE_UP' : 'MOVE_DOWN';
                ws1.send(JSON.stringify({ action: move }));
            }
            
            if (ws2.readyState === WebSocket.OPEN) {
                // P2 intenta seguir la bola (Fake AI)
                ws2.send(JSON.stringify({ action: 'MOVE_UP' }));
            }
        }, 100); 

    } catch (error) {
        console.error('\n❌ ERROR:', error);
        process.exit(1);
    }
}

runSimulation();
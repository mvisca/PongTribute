// TEST/SCRIPT DE INTEGRACION REAL QUE SIMULA 2 CLIENTES REMOTOS JUGANDO
//
//1. Registra y loguea a Player1 (contra Auth/User Service)
//2. Registra y loguea a Player2
//3. Player1 pide partida publica (server lo pone en cola)
//4. Player2 pide partida publica (server hace matchmaking, 
// saca a P1 de Redis, crea la partida en DB y retorna matchId).
//5. Ambos se conectan por Websocket (ws://...) a esa partida
//6. Reciben del server MTCH_JOINED para comfirmar

//Para que funcione necesitas tener toda la plataforma levantada
//  y usar 4 terminales:
//
//Terminal1:
	//1. Base de datos y caché
	// docker compose up -d redis

	//2. Compilar shared (si hiciste cambios)
	// pnpm build --filter @transcendence/shared

	//3. Levantar User Service (Puerto 3001)
	// pnpm start:dev-user
//Terminal2:
	// Levantar Auth Service (Puerto 3002). Emite los JWT que Game validará.
	// pnpm start:dev-auth
//Terminal3:
	// Levantar Game Service (Puerto 3003). Aqui veras los logs del jugador
	// pnpm start:dev-game
// Terminal4:
	// Ejecutar directamente con tsx desde la raíz
	// pnpm --filter @transcendence/game exec tsx test/test-e2e-full.ts


import { randomUUID } from 'crypto';
import WebSocket from 'ws';

// CONFIGURACIÓN DE PUERTOS (Ajusta según tu docker-compose o local)
const AUTH_URL = 'http://localhost:3002/api/auth'; // Auth Service
const GAME_URL = 'http://localhost:3003/api/matches'; // Game Service (REST)
const WS_URL = 'ws://localhost:3003/api/game/ws'; // Game Service (WS)

// Función auxiliar para pausas
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function registerAndLogin(alias: string) {
    // Generamos un sufijo aleatorio UNA vez
    const suffix = randomUUID().substring(0,5);
    
    const email = `test.${alias}.${suffix}@test.com`;
    // Username único para evitar Conflictos en la DB
	const uniqueUsername = `${alias}_${suffix}`;
	
    const password = 'Password123!';
    // URL dummy válida
	const avatar = 'https://i.pravatar.cc/150?u=' + alias;
	
    console.log(`\n👤 [${alias}] Registrando: ${uniqueUsername} (${email})`);
    
    // 1. REGISTER (Auth Service -> User Service)
    const regRes = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: uniqueUsername, password, avatar })
    });

    if (!regRes.ok) throw new Error(`Fallo registro ${alias}: ${await regRes.text()}`);

    // 2. LOGIN (Auth Service -> Devuelve JWT)
    console.log(`🔑 [${alias}] Iniciando sesión...`);
    const loginRes = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!loginRes.ok) throw new Error(`Fallo login ${alias}`);
    
    const data = await loginRes.json() as any; 
    
    // 2. BUSCAR EL TOKEN (Cubre las opciones más comunes)
    const token = data.accessToken || data.token || data.access_token;

    if (!token) {
        throw new Error(`😱 EL SERVIDOR NO DEVOLVIÓ UN TOKEN VISIBLE. Respuesta: ${JSON.stringify(data)}`);
    }

    console.log(`✅ [${alias}] Token obtenido: ${token.substring(0, 10)}...`);
    return token;
}

async function joinPublicMatch(token: string, alias: string) {
    console.log(`\nSEARCH [${alias}] Buscando partida pública...`);
    
    const res = await fetch(GAME_URL, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ matchType: 'public' }) // Payload Correcto
    });

    const body = await res.json() as any;
    console.log(`📄 [${alias}] Respuesta Servidor:`, body);
    return body;
}

async function connectWebSocket(token: string, matchId: string, alias: string) {
    return new Promise<void>((resolve, reject) => {
        const url = `${WS_URL}?token=${token}&matchId=${matchId}`;
        console.log(`🔌 [${alias}] Conectando WS a sala ${matchId}...`);
        
        const ws = new WebSocket(url);

        ws.on('open', () => console.log(`\n   ✨ [${alias}] Socket Abierto`));
        
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.event === 'JOINED_MATCH') {
                console.log(`   🚀 [${alias}] YA ESTÁ EN LA SALA! Status: ${msg.data.status}`);
                ws.close();
                resolve();
            }
        });

        ws.on('error', (err) => reject(err));
    });
}

async function runTest() {
    try {
        console.log('🏁 INICIANDO TEST E2E COMPLETO');

        // 1. Autenticación Real
        const tokenP1 = await registerAndLogin('Player1');
        const tokenP2 = await registerAndLogin('Player2');

        // 2. Matchmaking Público
        // Player 1 entra a la cola
        const res1 = await joinPublicMatch(tokenP1, 'Player1'); 
        // Esperamos que diga "added_to_queue"

        // Simulamos un pequeño delay humano
        await sleep(500);

        // Player 2 entra y hace match
        const res2 = await joinPublicMatch(tokenP2, 'Player2');
        // Esperamos que res2 contenga el objeto match o "match_found"
        
        const matchId = res2.match ? res2.match.id : res2.id; // Ajustar según tu respuesta exacta
        if (!matchId) throw new Error('No se recibió Match ID en la respuesta del P2');

        console.log(`\n  MATCH ENCONTRADO ID: ${matchId}\n`);

        // 3. Conexión WebSocket Simultánea
        await Promise.all([
            connectWebSocket(tokenP1, matchId, 'Player1'),
            connectWebSocket(tokenP2, matchId, 'Player2')
        ]);

		console.log('\n🎉 TEST FINALIZADO CON ÉXITO: Flujo Completo Validado.');
		console.log('========================================================');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error);
        process.exit(1);
    }
}

runTest();
// packages/game/test-game.ts
import { io } from "socket.io-client";

// APUNTAMOS AL GATEWAY (La entrada real del sistema)
const GATEWAY_URL = "http://127.0.0.1:3000";

async function runTest() {
    console.log("🧪 INICIANDO TEST INTEGRAL (VÍA GATEWAY)");

    try {
        // 1. LOGIN (Ruta Pública: /api/auth/login)
        console.log(`1️⃣  Autenticando en ${GATEWAY_URL}/api/auth/login...`);
        const loginRes = await fetch(`${GATEWAY_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "test@example.com", 
                password: "password123"
            })
        });

        if (!loginRes.ok) {
            const txt = await loginRes.text();
            throw new Error(`Login falló (${loginRes.status}): ${txt}`);
        }
        
        const loginData = await loginRes.json() as any;
        const token = loginData.accessToken;
        console.log("✅ Token obtenido.");

        // 2. CREAR PARTIDA (Ruta Pública: /api/matches)
        // El Gateway redirige /api/matches -> Game Service
        console.log(`2️⃣  Creando partida vía Gateway...`);
        
        const createRes = await fetch(`${GATEWAY_URL}/api/matches`, { 
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                matchType: 'local',
                gameMode: 'classic'
            })
        });

        if (!createRes.ok) {
             const txt = await createRes.text();
             throw new Error(`Crear partida falló (${createRes.status}): ${txt}`);
        }

        const match = await createRes.json() as any;
        console.log(`✅ Partida creada! ID: ${match.id}`);

        // 3. CONEXIÓN WEBSOCKET (Vía Gateway)
        console.log("3️⃣  Conectando WebSocket...");
        
        // IMPORTANTE: En tu Gateway vi que la ruta WS es /api/game/ws
        const socket = io(GATEWAY_URL, { 
            path: '/api/game/ws', // <--- COINCIDE CON TU GATEWAY APP.TS
            query: {
                token: token,
                matchId: match.id
            },
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log("✅ WS Conectado! Socket ID:", socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error("❌ Error WS:", err.message);
        });

        socket.on('match_start', (payload) => {
            console.log("🚀 MATCH START RECIBIDO!", payload);
            // Simular input
            setTimeout(() => {
                console.log("🏓 Enviando input...");
                socket.emit('paddle_move', { direction: 'up' });
            }, 1000);
        });

        let updates = 0;
        socket.on('game_update', (gameState) => {
            updates++;
            if (updates % 60 === 0) console.log(`🎮 Game Loop activo. Ball Y: ${gameState.ball.y}`);
        });

        socket.on('match_end', (result) => {
            console.log("🏁 Partida terminada:", result);
            socket.disconnect();
            process.exit(0);
        });

    } catch (error: any) {
        console.error("🔥 ERROR:", error.message);
        process.exit(1);
    }
}

runTest();

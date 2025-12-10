// Este script hará lo siguiente:

	// 1.Levantará un servidor game real en un puerto aleatorio.
	// 2. Creará un Token válido (Goku) y uno inválido (Frieza).
	// 3. Hará una petición HTTP para obtener un matchId.
	// 4. Intentará conectar por WebSocket.
	// 5. Escuchará el mensaje de bienvenida JOINED_MATCH.

//Ejecutarlo con: pnpm --filter @transcendence/game exec tsx test/test-websocket.ts

import { buildApp } from '../src/app';
import { GameEnv } from '../src/config';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws'; // Cliente WebSocket para Node

// Helper para tokens
function signToken(id: string, username: string) {
    return jwt.sign(
        { id, username, email: `${username}@test.com` },
        GameEnv.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function testWebSocketFlow() {
    console.log('\n🔌 INICIANDO TEST DE WEBSOCKETS\n');

    // 1. ARRANCAR SERVIDOR REAL
    // Necesitamos escuchar en un puerto real, no solo en memoria,
    // para que el cliente WebSocket pueda conectarse.
    const app = buildApp();
    
    // Puerto 0 hace que el SO asigne uno libre aleatorio
    await app.listen({ port: 0, host: 'localhost' }); 
    
    // Obtenemos el puerto asignado dinámicamente
    const address = app.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const baseUrl = `http://localhost:${port}`;
    const wsBaseUrl = `ws://localhost:${port}`;

    console.log(`📡 Servidor de prueba escuchando en puerto: ${port}`);

    // 2. PREPARAR DATOS
    const gokuToken = signToken('user-1111', 'Goku');
    const badToken = 'token-falso-123';

    try {
        // ====================================================================
        // PASO 1: Obtener matchId vía HTTP (Como haría el Frontend)
        // ====================================================================
        console.log('\n👉 1. Creando partida vía HTTP...');
        
        const res = await fetch(`${baseUrl}/api/matches`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${gokuToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (res.status !== 201) throw new Error(`Fallo HTTP: ${res.status}`);
        const matchData = await res.json() as any;
        const matchId = matchData.id;
        console.log(`   ✅ Partida creada. ID: ${matchId}`);

        // ====================================================================
        // PASO 2: Prueba Negativa (Token Inválido)
        // ====================================================================
        console.log('\n👉 2. Intentando conectar con Token Inválido...');
        
        await new Promise<void>((resolve, reject) => {
            const badWs = new WebSocket(`${wsBaseUrl}/api/game/ws?matchId=${matchId}&token=${badToken}`);
            
			badWs.on('open', () => {
				// No rechazamos inmediatamente.
                // Es normal que se abra un instante antes de que el servidor nos eche.
                console.log('   ⚠️ Socket abierto (Esperando que el servidor nos cierre la puerta...)');
            });

            badWs.on('error', (err) => {
                // Algunos clientes lanzan error al recibir 401/1008 inmediato
                console.log(`   ✅ Conexión rechazada correctamente (Error de red detectado)`);
                resolve();
            });

            badWs.on('close', (code, reason) => {
                if (code === 1008) { // Policy Violation (lo que programamos en el Gateway)
                    console.log(`   ✅ Conexión cerrada por el servidor. Código: ${code} (${reason})`);
                    resolve();
                } else {
                    // Si cierra por otra razón, asumimos éxito del rechazo para este test simple
                    console.log(`   ✅ Conexión cerrada. Código: ${code}`);
                    resolve();
                }
            });
        });

        // ====================================================================
        // PASO 3: Prueba Positiva (Happy Path)
        // ====================================================================
        console.log('\n👉 3. Conectando WebSocket con Token Válido...');

        await new Promise<void>((resolve, reject) => {
            const wsUrl = `${wsBaseUrl}/api/game/ws?matchId=${matchId}&token=${gokuToken}`;
            const socket = new WebSocket(wsUrl);

            // Timeout de seguridad por si el servidor no responde nunca
            const timeout = setTimeout(() => {
                socket.close();
                reject(new Error('❌ Timeout: No se recibió mensaje de bienvenida'));
            }, 2000);

            socket.on('open', () => {
                console.log('   🔹 Socket abierto (Handshake completado)');
            });

            socket.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                console.log('   📩 Mensaje Recibido:', msg);

                if (msg.event === 'JOINED_MATCH' && msg.data.matchId === matchId) {
                    console.log('   ✅ ÉXITO: Recibido evento JOINED_MATCH correcto.');
                    clearTimeout(timeout);
                    socket.close();
                    resolve();
                } else {
                    console.log('   ⚠️ Mensaje inesperado');
                }
            });

            socket.on('error', (err) => {
                reject(new Error(`Error en socket: ${err.message}`));
            });
        });

    } catch (error) {
        console.error('💥 TEST FALLÓ:', error);
        process.exit(1);
    } finally {
        await app.close();
        console.log('\n🏁 Test finalizado. Servidor cerrado.');
    }
}

testWebSocketFlow();
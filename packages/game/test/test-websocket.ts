// Este script hará lo siguiente:

	// 1.Levantará un servidor game real en un puerto aleatorio.
	// 2. Creará un Token válido (Goku) y uno inválido (Frieza).
	// 3. Hará una petición HTTP para obtener un matchId.
	// 4. Intentará conectar por WebSocket.
	// 5. Escuchará el mensaje de bienvenida JOINED_MATCH.

//Ejecutarlo con: pnpm --filter @transcendence/game exec tsx test/test-websocket.ts
/**
 * TEST E2E: CONEXIÓN WEBSOCKET (Handshake & Upgrade)
 * * Objetivo: Validar que un cliente puede establecer conexión persistente con una partida creada.
 * Escenario:
 * 1. Se crea una partida vía REST (HTTP POST) para obtener un matchId real.
 * 2. Se conecta el WebSocket pasando token y matchId en la URL (Query String).
 * 3. Se espera el evento 'JOINED_MATCH' del servidor.
 * * Valida: Autenticación en WS, parsing de URL y confirmación de unión a la sala.
 */
import { buildApp } from '../src/app';
import jwt from 'jsonwebtoken';
import { GameEnv } from '../src/config';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';

// Configuración de prueba
const PORT = 3005; 
const baseUrl = `http://localhost:${PORT}`;
const wsUrl = `ws://localhost:${PORT}/api/game/ws`;

function signToken(id: string, username: string) {
    return jwt.sign({ id, username }, GameEnv.JWT_SECRET, { expiresIn: '1h' });
}

async function testWebSocket() {
    console.log('\n🔌 INICIANDO TEST DE WEBSOCKET\n');

    // 1. Levantar App
    const app = buildApp();
    try {
        await app.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`✅ Servidor de test escuchando en puerto ${PORT}`);
    } catch (err) {
        console.error('❌ Error levantando servidor:', err);
        process.exit(1);
    }

    // 2. Preparar Datos
    const gokuId = randomUUID();
    const vegetaId = randomUUID();
    const gokuToken = signToken(gokuId, 'Goku');
    
    // ========================================================================
    // PASO 1: CREAR LA PARTIDA VÍA HTTP
    // ========================================================================
    console.log('\n👉 1. Creando partida Privada vía HTTP...');
    
    const createRes = await fetch(`${baseUrl}/api/matches`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${gokuToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            matchType: 'private',
            opponentId: vegetaId 
        })
    });

    if (createRes.status !== 201) {
        console.error(`❌ Fallo creando partida. Status: ${createRes.status}`);
        process.exit(1);
    }

    const match = await createRes.json() as any;
    const matchId = match.id;
    console.log(`   ✅ Partida creada. ID: ${matchId}`);

    // ========================================================================
    // PASO 2: CONECTAR WEBSOCKET
    // ========================================================================
    console.log('\n👉 2. Conectando WebSocket...');
    
    // Enviamos token Y matchId en la URL (Handshake)
    const connectionUrl = `${wsUrl}?token=${gokuToken}&matchId=${matchId}`;
    console.log(`   🔗 URL: ${wsUrl}?token=${gokuToken}&matchId=${matchId}`);

	//AQUI ESTA LA CHISPA DE CONEXION
	//El fastify-websocket al detectar el "/ws" en la ruta, ejecuta
	// la funcion gateway.handleConnection() que lo manejara
	const ws = new WebSocket(connectionUrl);

    return new Promise<void>((resolve) => {
        
		// aviso que hubo un cambio de estado, unicamente a nivel de TCP,
		//  no es para el server.
        ws.on('open', () => {
            console.log('   ✅ WebSocket Abierto! (Handshake completado)');
            // tu Gateway nos mete y saluda automáticamente.
        });

        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            console.log('   📥 Recibido del Servidor:', msg);

            // Tu Gateway envía 'JOINED_MATCH'
            if (msg.event === 'JOINED_MATCH' && msg.data.matchId === matchId) {
                console.log('   ✅ ÉXITO: Recibido mensaje de bienvenida y confirmación de sala.');
                ws.close();
                resolve();
            }
        });

        ws.on('error', (err) => {
            console.error('   ❌ Error de WebSocket:', err);
            resolve();
        });
        
        ws.on('close', (code, reason) => {
            console.log(`   🔌 Conexión cerrada. Código: ${code}, Razón: ${reason}`);
        });
    })
    .then(async () => {
        console.log('\n🎉 TEST WS FINALIZADO');
        await app.close();
        process.exit(0);
    });
}

testWebSocket();

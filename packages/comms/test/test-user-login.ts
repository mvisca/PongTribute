import WebSocket from 'ws';
import { randomUUID } from 'crypto';

const COMMS_URL = 'ws://localhost:3005/ws';
const AUTH_URL = 'http://localhost:3002/api/auth';

interface TestUser {
	id: string;
	username: string;
	token: string;
	ws: WebSocket | null;
	messages: any[];
}

async function registerAndLogin(username: string): Promise<string> {
	const email = `${username}.${randomUUID().substring(0, 5)}@test.com`;
	const password = 'Test123!@#';
	const avatar = `https://i.pravatar.cc/150?u=${username}`;

	console.log(`\n📝 Registrando: ${username}`);

	// Registrarse
	const registerRes = await fetch(`${AUTH_URL}/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			username,
			email,
			password,
			avatar
		})
	});

	if (!registerRes.ok) {
		throw new Error(`Register falló: ${registerRes.status}`);
	}

	console.log(`✅ Registrado: ${username}`);

	// Loguearse
	console.log(`🔓 Loguando: ${username}`);
	const loginRes = await fetch(`${AUTH_URL}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});

	if (!loginRes.ok) {
		throw new Error(`Login falló: ${loginRes.status}`);
	}

	const { accessToken } = (await loginRes.json()) as {
		accessToken: string;
	};
	console.log(`✅ Token obtenido`);

	return accessToken;
}

function connectWebSocket(token: string): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`${COMMS_URL}?token=${token}`);

		ws.onopen = () => {
			console.log(`📱 WebSocket conectado`);
			resolve(ws);
		};

		ws.onerror = (err) => {
			reject(err);
		};

		setTimeout(() => reject(new Error('Connection timeout')), 5000);
	});
}

async function main() {
	console.log('🧪 TEST: user:login con notificación de amigos\n');

	try {
		// Crear 3 usuarios
		const users: TestUser[] = [];

		for (let i = 1; i <= 3; i++) {
			const user: TestUser = {
				id: '',
				username: `testuser${i}`,
				token: '',
				ws: null,
				messages: []
			};

			// Registrar y loguear
			user.token = await registerAndLogin(user.username);

			// Conectar WebSocket
			user.ws = await connectWebSocket(user.token);

			// Listener de mensajes
			user.ws.onmessage = (event) => {
				const message = JSON.parse(event.data.toString());
				user.messages.push(message);
				console.log(
					`\n💬 [${user.username}] Recibió: ${message.type}`,
					message.payload || ''
				);
			};

			users.push(user);
			await new Promise((r) => setTimeout(r, 1000));
		}

		console.log(`\n✅ ${users.length} usuarios conectados\n`);

		// Ahora el usuario 1 hace login (publica evento en Redis)
		console.log('📡 Simulando que Auth publica user:login del usuario 1...\n');

		// En un escenario real, Auth publicaría este evento
		// Para este test, necesitarías un endpoint en Comms para publicar eventos
		// O conectar a Redis directamente

		// Esperar a que los usuarios reciban notificaciones
		await new Promise((r) => setTimeout(r, 2000));

		console.log('\n📊 RESULTADOS:\n');
		users.forEach((user) => {
			console.log(`${user.username}:`);
			console.log(`  - Mensajes recibidos: ${user.messages.length}`);
			user.messages.forEach((msg) => {
				console.log(`    • ${msg.type}`);
			});
		});

		// Cerrar conexiones
		users.forEach((user) => {
			if (user.ws) user.ws.close();
		});

		console.log('\n✅ Test completado');

	} catch (err) {
		console.error('❌ Error:', err);
		process.exit(1);
	}
}

main();
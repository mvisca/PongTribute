import jwt from 'jsonwebtoken';

// CONFIGURACIÓN
const API_URL = 'http://localhost:3003/api'; // Asegúrate que este puerto coincida con tu .env del GAME
const JWT_SECRET = process.env.JWT_SECRET || 'transcendence-secret-key'; // El mismo que en tu .env

// SIMULACIÓN DE USUARIOS
const P1 = { id: '11111111-1111-1111-1111-111111111111', name: 'PlayerOne' };
const P2 = { id: '22222222-2222-2222-2222-222222222222', name: 'PlayerTwo' };

// HELPER: Generar Token Falso (Para pasar el Middleware)
function getToken(user: { id: string }) {
    return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
}

// HELPER: Cliente HTTP simplificado
async function req(method: string, path: string, token: string, body?: any) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    console.log(`[${method}] ${path} -> Status: ${res.status}`);
    return { status: res.status, data };
}

async function runTest() {
    console.log('🚀 INICIANDO TEST DE INTEGRACIÓN DE JUEGO');
    
    const t1 = getToken(P1);
    const t2 = getToken(P2);

    // ==========================================
    // ESCENARIO 1: COLA PÚBLICA (MATCHMAKING)
    // ==========================================
    console.log('\n--- 🧪 TEST 1: PUBLIC QUEUE ---');
    
    // 1. Player 1 se une (Debe recibir "added_to_queue")
    console.log('👉 Player 1 se une a la cola...');
    const r1 = await req('POST', '/matches', t1, { matchType: 'public' });
    console.log('   Resultado P1:', r1.data);

    // 2. Player 2 se une (Debe recibir "match_found")
    console.log('👉 Player 2 se une a la cola...');
    const r2 = await req('POST', '/matches', t2, { matchType: 'public' });
    console.log('   Resultado P2:', r2.data); // Debería contener el objeto Match

    // ==========================================
    // ESCENARIO 2: PARTIDA PRIVADA & CANCELACIÓN
    // ==========================================
    console.log('\n--- 🧪 TEST 2: PRIVATE FLOW (CANCEL) ---');

    // 1. P1 invita a P2
    console.log('👉 P1 invita a P2...');
    const r3 = await req('POST', '/matches', t1, { matchType: 'private', opponentId: P2.id });
    const matchId = r3.data.id;
    console.log('   Match ID:', matchId);

    if (matchId) {
        // 2. P1 se arrepiente y cancela
        console.log('👉 P1 cancela la invitación...');
        const r4 = await req('DELETE', `/matches/${matchId}`, t1);
        console.log('   Cancelación:', r4.data);

        // 3. P2 intenta aceptar (Debe fallar 404 o similar)
        console.log('👉 P2 intenta aceptar la invitación borrada...');
        const r5 = await req('POST', `/matches/${matchId}/accept`, t2);
        console.log('   Intento aceptación:', r5.data); // Esperamos error
    }

    // ==========================================
    // ESCENARIO 3: PARTIDA PRIVADA & ACEPTACIÓN
    // ==========================================
    console.log('\n--- 🧪 TEST 3: PRIVATE FLOW (SUCCESS) ---');
    
    console.log('👉 P1 invita a P2 (Nuevamente)...');
    const r6 = await req('POST', '/matches', t1, { matchType: 'private', opponentId: P2.id });
    const matchId2 = r6.data.id;

    if (matchId2) {
        console.log('👉 P2 acepta la invitación...');
        const r7 = await req('POST', `/matches/${matchId2}/accept`, t2);
        console.log('   Aceptación:', r7.data); // Debería devolver match con status 'active'
    }
}

runTest();


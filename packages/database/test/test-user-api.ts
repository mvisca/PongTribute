import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { Utils } from '../../shared/src';

// ============================================================================
// HELPERS
// ============================================================================

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, error?: string) {
	results.push({
		name: testName,
		passed: condition,
		error: error || 'Assertion failed'
	});
	
	if (condition) {
		console.log(`✅ ${testName}`);
	} else {
		console.log(`❌ ${testName}: ${error || 'failed'}`);
	}
}

function assertEquals(actual: any, expected: any, testName: string) {
	const passed = actual === expected;
	assert(passed, testName, `Expected ${expected}, got ${actual}`);
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
	let app: FastifyInstance | null = null;
	
	try {
		console.log('🚀 Iniciando tests de User API\n');
		
		// Setup
		app = buildApp();
		await app.ready();
		
		// Test data
		const testUser = {
			username: 'testuser',
			email: 'test@example.com',
			passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
			avatar: 'avatar.png'
		};
		
		let createdUserId: string;
		
		// ========================================================================
		// SUITE 1: CREATE USER (POST /users)
		// ========================================================================
		console.log('📦 SUITE 1: CREATE USER\n');
		
		// Test 1.1: Crear usuario válido
		{
			const response = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: testUser
			});
			
			assertEquals(response.statusCode, 201, '1.1 Status code debe ser 201');
			
			const body = response.json();
			createdUserId = body.id;
			
			assert(!!body.id, '1.1 Response debe tener ID');
			assertEquals(body.username, testUser.username, '1.1 Username debe coincidir');
			assertEquals(body.email, testUser.email, '1.1 Email debe coincidir');
			assert(!body.passwordHash, '1.1 Response NO debe contener passwordHash');
			assert(!!body.createdAt, '1.1 Response debe tener createdAt');
		}
		
		// Test 1.2: Crear usuario con email duplicado (409)
		{
			const response = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: {
					username: 'different',
					email: testUser.email, // Duplicado
					passwordHash: 'hash'
				}
			});
			
			assertEquals(response.statusCode, 409, '1.2 Email duplicado debe retornar 409');
			
			const body = response.json();
			assertEquals(body.field, 'email', '1.2 Error debe indicar campo email');
		}
		
		// Test 1.3: Crear usuario con username duplicado (409)
		{
			const response = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: {
					username: testUser.username, // Duplicado
					email: 'different@example.com',
					passwordHash: 'hash'
				}
			});
			
			assertEquals(response.statusCode, 409, '1.3 Username duplicado debe retornar 409');
			
			const body = response.json();
			assertEquals(body.field, 'username', '1.3 Error debe indicar campo username');
		}
		
		// Test 1.4: Crear usuario sin email (400 - schema validation)
		{
			const response = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: {
					username: 'nomail',
					passwordHash: '$2b$10$YetAnotherHash1234567890123456789012345678901234567'
					// email falta
				}
			});
			
			assertEquals(response.statusCode, 400, '1.4 Sin email debe retornar 400');
		}
		
		console.log('');
		
		// ========================================================================
		// SUITE 2: GET USER BY ID (GET /users/:id)
		// ========================================================================
		console.log('📦 SUITE 2: GET USER BY ID\n');
		
		// Test 2.1: Obtener usuario existente
		{
			const response = await app.inject({
				method: 'GET',
				url: `/users/${createdUserId}`
			});
			
			assertEquals(response.statusCode, 200, '2.1 Status debe ser 200');
			
			const body = response.json();
			assertEquals(body.id, createdUserId, '2.1 ID debe coincidir');
			assert(!body.passwordHash, '2.1 Response NO debe contener passwordHash');
		}
		
		// Test 2.2: Obtener usuario inexistente (404)
		{
			const fakeId = Utils.generateUserId();
			const response = await app.inject({
				method: 'GET',
				url: `/users/${fakeId}`
			});
			
			assertEquals(response.statusCode, 404, '2.2 Usuario inexistente debe retornar 404');
		}
		
		console.log('');
		
		// ========================================================================
		// SUITE 3: GET USER BY USERNAME (GET /users/username/:username)
		// ========================================================================
		console.log('📦 SUITE 3: GET USER BY USERNAME\n');
		
		// Test 3.1: Buscar por username existente
		{
			const response = await app.inject({
				method: 'GET',
				url: `/users/username/${testUser.username}`
			});
			
			assertEquals(response.statusCode, 200, '3.1 Status debe ser 200');
			
			const body = response.json();
			assertEquals(body.username, testUser.username, '3.1 Username debe coincidir');
		}
		
		// Test 3.2: Buscar por username inexistente (404)
		{
			const response = await app.inject({
				method: 'GET',
				url: '/api/users/username/nonexistent'
			});
			
			assertEquals(response.statusCode, 404, '3.2 Username inexistente debe retornar 404');
		}
		
		// Test 3.3: Case insensitive search
		{
			const response = await app.inject({
				method: 'GET',
				url: `/users/username/${testUser.username.toUpperCase()}`
			});
			
			assertEquals(response.statusCode, 200, '3.3 Búsqueda debe ser case-insensitive');
		}
		
		console.log('');
		
		// ========================================================================
		// SUITE 4: CHECK USERNAME (GET /users/check-username/:username)
		// ========================================================================
		console.log('📦 SUITE 4: CHECK USERNAME\n');
		
		// Test 4.1: Username disponible
		{
			const response = await app.inject({
				method: 'GET',
				url: '/api/users/check-username/availableusername'
			});
			
			assertEquals(response.statusCode, 200, '4.1 Status debe ser 200');
			
			const body = response.json();
			assert(body.available === true, '4.1 Username debe estar disponible');
		}
		
		// Test 4.2: Username no disponible
		{
			const response = await app.inject({
				method: 'GET',
				url: `/users/check-username/${testUser.username}`
			});
			
			assertEquals(response.statusCode, 200, '4.2 Status debe ser 200');
			
			const body = response.json();
			assert(body.available === false, '4.2 Username NO debe estar disponible');
		}
		
		console.log('');
		
		// ========================================================================
		// SUITE 5: CHECK EMAIL (GET /users/check-email/:email)
		// ========================================================================
		console.log('📦 SUITE 5: CHECK EMAIL\n');
		
		// Test 5.1: Email disponible
		{
			const response = await app.inject({
				method: 'GET',
				url: '/api/users/check-email/available@example.com'
			});
			
			assertEquals(response.statusCode, 200, '5.1 Status debe ser 200');
			
			const body = response.json();
			assert(body.available === true, '5.1 Email debe estar disponible');
		}
		
		// Test 5.2: Email no disponible
		{
			const response = await app.inject({
				method: 'GET',
				url: `/users/check-email/${testUser.email}`
			});
			
			assertEquals(response.statusCode, 200, '5.2 Status debe ser 200');
			
			const body = response.json();
			assert(body.available === false, '5.2 Email NO debe estar disponible');
		}
		
		console.log('');
		
		// ========================================================================
		// SUITE 6: UPDATE USER (PUT /users/:id)
		// ========================================================================
		console.log('📦 SUITE 6: UPDATE USER\n');
		
		// Test 6.1: Actualizar username
		{
			const response = await app.inject({
				method: 'PUT',
				url: `/users/${createdUserId}`,
				payload: {
					username: 'updated_username'
				}
			});
			
			assertEquals(response.statusCode, 200, '6.1 Status debe ser 200');
			
			const body = response.json();
			assertEquals(body.username, 'updated_username', '6.1 Username debe actualizarse');
		}
		
		// Test 6.2: Actualizar a username ya existente (409)
		{
			// Crear segundo usuario
			const user2 = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: {
					username: 'user2',
					email: 'user2@example.com',
					passwordHash: '$2b$10$User2Hash12345678901234567890123456789012345678901'
				}
			});
			
			const user2Id = user2.json().id;
			
			// Intentar actualizar user2 al username de testUser
			const response = await app.inject({
				method: 'PUT',
				url: `/users/${user2Id}`,
				payload: {
					username: 'updated_username' // Ya usado por testUser
				}
			});
			
			assertEquals(response.statusCode, 409, '6.2 Username duplicado debe retornar 409');
		}
		
		// Test 6.3: Actualizar usuario inexistente (404)
		{
			const fakeId = Utils.generateUserId();
			const response = await app.inject({
				method: 'PUT',
				url: `/users/${fakeId}`,
				payload: {
					username: 'whatever'
				}
			});
			
			assertEquals(response.statusCode, 404, '6.3 Usuario inexistente debe retornar 404');
		}
		
		console.log('');
		
		// ========================================================================
		// SUITE 7: UPDATE PASSWORD (PUT /users/:id/password)
		// ========================================================================
		console.log('📦 SUITE 7: UPDATE PASSWORD\n');
		
		// Test 7.1: Actualizar password
		{
			const response = await app.inject({
				method: 'PUT',
				url: `/users/${createdUserId}/password`,
				payload: {
					newPasswordHash: '$2b$10$User2Hash12345678901234567890123456789012345678901'
				}
			});
			
			assertEquals(response.statusCode, 204, '7.1 Status debe ser 204');
			assert(response.body === '', '7.1 Body debe estar vacío');
		}
		
		// Test 7.2: Actualizar password de usuario inexistente (404)
		{
			const fakeId = Utils.generateUserId();
			const response = await app.inject({
				method: 'PUT',
				url: `/users/${fakeId}/password`,
				payload: {
					newPasswordHash: '$2b$10$NewHash123456789012345678901234567890123456789012'
				}
			});
			
			assertEquals(response.statusCode, 404, '7.2 Usuario inexistente debe retornar 404');
		}
		
		console.log('');
		
		// ========================================================================
		// SUITE 8: DELETE USER (DELETE /users/:id)
		// ========================================================================
		console.log('📦 SUITE 8: DELETE USER\n');
		
		// Test 8.1: Eliminar usuario existente
		{
			const response = await app.inject({
				method: 'DELETE',
				url: `/users/${createdUserId}`
			});
			
			assertEquals(response.statusCode, 204, '8.1 Status debe ser 204');
			assert(response.body === '', '8.1 Body debe estar vacío');
			
			// Verificar que ya no existe
			const getResponse = await app.inject({
				method: 'GET',
				url: `/users/${createdUserId}`
			});
			
			assertEquals(getResponse.statusCode, 404, '8.1 Usuario eliminado no debe encontrarse');
		}
		
		// Test 8.2: Eliminar usuario inexistente (404)
		{
			const fakeId = Utils.generateUserId();
			const response = await app.inject({
				method: 'DELETE',
				url: `/users/${fakeId}`
			});
			
			assertEquals(response.statusCode, 404, '8.2 Usuario inexistente debe retornar 404');
		}
		
		console.log('');
		
		// ========================================================================
		// RESUMEN
		// ========================================================================
		console.log('═'.repeat(60));
		console.log('📊 RESUMEN DE TESTS');
		console.log('═'.repeat(60));
		
		const passed = results.filter(r => r.passed).length;
		const failed = results.filter(r => !r.passed).length;
		const total = results.length;
		
		console.log(`\n✅ Passed: ${passed}/${total}`);
		console.log(`❌ Failed: ${failed}/${total}`);
		console.log(`📈 Coverage: ${Math.round((passed / total) * 100)}%\n`);
		
		if (failed > 0) {
			console.log('❌ TESTS FALLIDOS:');
			results.filter(r => !r.passed).forEach(r => {
				console.log(`   - ${r.name}: ${r.error}`);
			});
			console.log('');
		}
		
		// Exit code
		process.exitCode = failed > 0 ? 1 : 0;
		
	} catch (error) {
		console.error('💥 Error fatal en tests:', error);
		process.exitCode = 1;
	} finally {
		// Cleanup
		if (app) {
			await app.close();
		}
	}
}

// ============================================================================
// RUN
// ============================================================================

runTests().catch(error => {
	console.error('💥 Error no capturado:', error);
	process.exit(1);
});
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { buildApp } from '../src/app';
import { UserTypes, Utils, TestUtils, TestConstants } from '@transcendence/shared';
import { getDatabase } from '../src/connection';
import { AuthTypes } from '@transcendence/shared';

// ============================================================================
// TEST RUNNER
// ============================================================================

interface TestResult {
	subject: string;
	test: string;
	expected: any;
	actual: any;
	passed: boolean;
}

const results: TestResult[] = [];
let testCounter = 0;

function test(subject: string, name: string, expected: any, actual: any) {
	let passed = undefined;
	if (typeof expected === "string")
		passed = expected.toLowerCase() === actual.toLowerCase();
	else
		passed = expected === actual;
	results.push({ subject, test: name, expected, actual, passed });
	
	testCounter++;
	const status = passed ? '✓' : '📍';
	const output = passed 
		? `${"=".repeat(40)}\n${status} ${testCounter}. [${subject}] ${name}`
		: `${status} ${testCounter}. [${subject}] ${name} | Expected: ${expected} | Got: ${actual}`;
	console.log(output);
}

// ============================================================================
// TEST USERS STORAGE
// ============================================================================

interface TestUserSession {
	id: string;
	token: string;
	username: string;
	email: string;
}

const testUsers = {
	user1: null as TestUserSession | null,
	user2: null as TestUserSession | null,
	user3: null as TestUserSession | null
};

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

async function setupTestUsers() {
	console.log('\n' + '⚙️ '.repeat(20));
	console.log('SETUP: Creando usuarios de prueba...');
	
	const db = getDatabase();
	db.prepare('DELETE FROM users').run();
	console.log('✓ Base de datos limpiada');
	
	// Crear user1
	const user1Response = await TestUtils.setupUser(TestConstants.TEST_USERS_KEYS[0]);
	testUsers.user1 = {
		id: user1Response.user.id,
		token: user1Response.token,
		username: user1Response.user.username,
		email: user1Response.user.email
	};
	console.log(`✓ User1 creado: ${testUsers.user1.username}`);
	
	// Crear user2
	const user2Response = await TestUtils.setupUser(TestConstants.TEST_USERS_KEYS[1]);
	testUsers.user2 = {
		id: user2Response.user.id,
		token: user2Response.token,
		username: user2Response.user.username,
		email: user2Response.user.email
	};
	console.log(`✓ User2 creado: ${testUsers.user2.username}`);
	
	// Crear user3
	const user3Response = await TestUtils.setupUser(TestConstants.TEST_USERS_KEYS[2]);
	testUsers.user3 = {
		id: user3Response.user.id,
		token: user3Response.token,
		username: user3Response.user.username,
		email: user3Response.user.email
	};
	console.log(`✓ User3 creado: ${testUsers.user3.username}`);
	
	console.log('SETUP: Usuarios listos para pruebas');
	console.log('⚙️ '.repeat(20) + '\n');
}

async function teardownTestUsers() {
	console.log('\n' + '🧹 '.repeat(20));
	console.log('TEARDOWN: Limpiando base de datos...');
	
	const db = getDatabase();
	db.prepare('DELETE FROM users').run();
	
	console.log('✓ Base de datos limpiada');
	console.log('TEARDOWN: Completado');
	console.log('🧹 '.repeat(20) + '\n');
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

async function runTests() {
	process.env.NODE_MODE = 'test';
	let app: FastifyInstance | null = null;
	
	try {
		// ====================================================================
		// INITIALIZATION
		// ====================================================================
		app = buildApp();
		await app.ready();
		
		console.log("\n" + "o".repeat(40));
		console.log("o       TEST SUITE - USER SERVICE      o");
		console.log("o".repeat(40) + "\n");
		
		// Setup inicial
		await setupTestUsers();
		
		// ====================================================================
		// SUBJECT 1: CREATE USER - VALIDATIONS
		// ====================================================================
		console.log('[VALIDATION - CREATE USER]');
		
		// Username validations
		{
			const tests = [
				{ payload: { username: 'ab', email: 'test@test.com', password: 'Pass123!' }, desc: 'Username too short' },
				{ payload: { username: 'a'.repeat(21), email: 'test@test.com', password: 'Pass123!' }, desc: 'Username too long' },
				{ payload: { username: 'user name', email: 'test@test.com', password: 'Pass123!' }, desc: 'Username with spaces' },
				{ payload: { username: 'user@123', email: 'test@test.com', password: 'Pass123!' }, desc: 'Username special chars' },
				{ payload: { username: '', email: 'test@test.com', password: 'Pass123!' }, desc: 'Username empty' }
			];
			
			for (const t of tests) {
				const res = await app.inject({ method: 'POST', url: '/api/users', payload: t.payload });
				test('VALIDATION', t.desc, 400, res.statusCode);
			}
		}
		
		// Email validations
		{
			const tests = [
				{ payload: { username: 'testuser', email: 'notanemail', password: 'Pass123!' }, desc: 'Email without @' },
				{ payload: { username: 'testuser', email: 'test@', password: 'Pass123!' }, desc: 'Email incomplete' },
				{ payload: { username: 'testuser', email: 'test @example.com', password: 'Pass123!' }, desc: 'Email with spaces' }
			];
			
			for (const t of tests) {
				const res = await app.inject({ method: 'POST', url: '/api/users', payload: t.payload });
				test('VALIDATION', t.desc, 400, res.statusCode);
			}
		}
		
		// Password validations
		{
			const tests = [
				{ payload: { username: 'testuser', email: 'test@test.com', password: 'short' }, desc: 'Password too short' },
				{ payload: { username: 'testuser', email: 'test@test.com', password: 'a'.repeat(60) }, desc: 'Password malformed' },
				{ payload: { username: 'testuser', email: 'test@test.com', password: '' }, desc: 'Password empty' }
			];
			
			for (const t of tests) {
				const res = await app.inject({ method: 'POST', url: '/api/users', payload: t.payload });
				test('VALIDATION', t.desc, 400, res.statusCode);
			}
		}
		
		// Required fields
		{
			const fullUser = { username: 'Full', email: 'full@test.com', password: 'Pass123!' };
			const tests = [
				{ payload: { email: fullUser.email, password: fullUser.password }, desc: 'Missing username' },
				{ payload: { username: fullUser.username, password: fullUser.password }, desc: 'Missing email' },
				{ payload: { username: fullUser.username, email: fullUser.email }, desc: 'Missing password' },
				{ payload: {}, desc: 'Empty body' }
			];
			
			for (const t of tests) {
				const res = await app.inject({ method: 'POST', url: '/api/users', payload: t.payload });
				test('VALIDATION', t.desc, 400, res.statusCode);
			}
		}
		
		// Duplicate validations
		{
			const res1 = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: { username: 'newuserValid', email: testUsers.user1!.email, password: 'pass12345', avatar: 'http://image.com/i.jpg' }
			});
			test('VALIDATION', 'Duplicate email returns 409', 409, res1.statusCode);
			
			const res2 = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: { username: testUsers.user1!.username, email: 'newValid@test.com', password: 'Pass12345', avatar: 'http://image.com/i.jpg' }
			});
			test('VALIDATION', 'Duplicate username returns 409', 409, res2.statusCode);
		}
		
		// ====================================================================
		// SUBJECT 2: READ USER
		// ====================================================================
		console.log('\n[READ USER]');
		
		// Get by ID
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/${testUsers.user1!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('READ', 'Get by ID returns 200', 200, res.statusCode);
			
			if (res.statusCode === 200) {
				const body = res.json();
				test('READ', 'ID matches', testUsers.user1!.id, body.id);
			}
		}
		
		// Get non-existent
		{
			const fakeId = Utils.generateUserId();
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/${fakeId}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('READ', 'Non-existent ID returns 404', 404, res.statusCode);
		}
		
		// Get by username
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/username/${testUsers.user1!.username}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('READ', 'Get by username returns 200', 200, res.statusCode);
		}
		
		// Username case-insensitive
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/username/${testUsers.user1!.username.toUpperCase()}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('READ', 'Username search case-insensitive', 200, res.statusCode);
		}
		
		// Invalid UUID
		{
			const res = await app.inject({
				method: 'GET',
				url: '/api/users/not-a-uuid',
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('READ', 'Invalid UUID returns 400', 400, res.statusCode);
		}
		
		// ====================================================================
		// SUBJECT 3: CHECK AVAILABILITY
		// ====================================================================
		console.log('\n[CHECK AVAILABILITY]');
		
		// Available username
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/check-username/available123`
			});
			test('CHECK', 'Available username returns 200', 200, res.statusCode);
			if (res.statusCode === 200) {
				test('CHECK', 'Username is available', true, res.json().available);
			}
		}
		
		// Taken username
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/check-username/${testUsers.user1!.username}`
			});
			test('CHECK', 'Taken username returns 200', 200, res.statusCode);
			if (res.statusCode === 200) {
				test('CHECK', 'Username not available', false, res.json().available);
			}
		}
		
		// Available email
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/check-email/available@test.com`
			});
			test('CHECK', 'Available email returns 200', 200, res.statusCode);
			if (res.statusCode === 200) {
				test('CHECK', 'Email is available', true, res.json().available);
			}
		}
		
		// Taken email
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/check-email/${testUsers.user1!.email}`
			});
			test('CHECK', 'Taken email returns 200', 200, res.statusCode);
			if (res.statusCode === 200) {
				test('CHECK', 'Email not available', false, res.json().available);
			}
		}
		
		// ====================================================================
		// SUBJECT 4: UPDATE USER
		// ====================================================================
		console.log('\n[UPDATE USER]');
		
		// Update username
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { username: 'UpdatedUser1' }
			});
			test('UPDATE', 'Update username returns 200', 200, res.statusCode);
			
			if (res.statusCode === 200) {
				const body = res.json();
				test('UPDATE', 'Username updated', 'UpdatedUser1', body.username);
			}
		}
		
		// Update email
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { email: 'updated1@test.com' }
			});
			test('UPDATE', 'Update email returns 200', 200, res.statusCode);
		}
		
		// Update to duplicate username
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user2!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user2!.token}` },
				payload: { username: 'UpdatedUser1' } // Ya tomado por user1
			});
			test('UPDATE', 'Duplicate username returns 409', 409, res.statusCode);
		}
		
		// Update non-existent user
		{
			const fakeId = Utils.generateUserId();
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${fakeId}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { username: 'whatever' }
			});
			test('UPDATE', 'Non-existent user returns 403', 403, res.statusCode);
		}
		
		// Invalid UUID
		{
			const res = await app.inject({
				method: 'PUT',
				url: '/api/users/not-a-uuid',
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { username: 'test' }
			});
			test('UPDATE', 'Invalid UUID returns 400', 400, res.statusCode);
		}
		
		// ====================================================================
		// SUBJECT 5: UPDATE PASSWORD
		// ====================================================================
		console.log('\n[UPDATE PASSWORD]');
		
		// Update password successfully
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}/password`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { newPasswordHash: bcrypt.hashSync('NewPass123!', 10) }
			});
			test('PASSWORD', 'Update password returns 204', 204, res.statusCode);
		}
		
		// Update password non-existent user
		{
			const fakeId = Utils.generateUserId();
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${fakeId}/password`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { newPasswordHash: bcrypt.hashSync('NewPass123!', 10) }
			});
			test('PASSWORD', 'Non-existent user returns 403', 403, res.statusCode);
		}
		
		// Invalid hash format
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}/password`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { newPasswordHash: 'not-a-bcrypt-hash' }
			});
			test('PASSWORD', 'Invalid hash returns 400', 400, res.statusCode);
		}
		
		// ====================================================================
		// SUBJECT 6: ANONYMIZE USER
		// ====================================================================
		console.log('\n[ANONYMIZE USER]');
		
		// Anonymize successfully
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user3!.id}/anonymize`,
				headers: { 'Authorization': `Bearer ${testUsers.user3!.token}` }
			});
			test('ANONYMIZE', 'Anonymize returns 204', 204, res.statusCode);
			
			// Verify anonymized
			const checkRes = await app.inject({
				method: 'GET',
				url: `/api/users/${testUsers.user3!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('ANONYMIZE', 'Anonymized user not found', 404, checkRes.statusCode);
		}
		
		// ====================================================================
		// SUBJECT 7: DELETE USER
		// ====================================================================
		console.log('\n[DELETE USER]');
		
		// Recrear user3 para test de delete
		const user3Fresh = await TestUtils.setupUser(TestConstants.TEST_USERS_KEYS[2]);
		testUsers.user3 = {
			id: user3Fresh.user.id,
			token: user3Fresh.token,
			username: user3Fresh.user.username,
			email: user3Fresh.user.email
		};
		
		// Delete successfully
		{
			const res = await app.inject({
				method: 'DELETE',
				url: `/api/users/${testUsers.user3!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user3!.token}` }
			});
			test('DELETE', 'Delete returns 204', 204, res.statusCode);
			
			// Verify deleted
			const checkRes = await app.inject({
				method: 'GET',
				url: `/api/users/${testUsers.user3!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('DELETE', 'Deleted user not found', 404, checkRes.statusCode);
		}
		
		// Delete non-existent
		{
			const fakeId = Utils.generateUserId();
			const res = await app.inject({
				method: 'DELETE',
				url: `/api/users/${fakeId}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('DELETE', 'Non-existent user returns 403', 403, res.statusCode);
		}

		// ====================================================================
		// SUBJECT 8: SECURITY - OWNERSHIP VIOLATIONS
		// ====================================================================
		console.log('\n[SECURITY - OWNERSHIP VIOLATIONS]');
		
		// User1 intenta modificar User2
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user2!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { username: 'hacked_by_user1' }
			});
			test('OWNERSHIP', 'User1 cannot modify User2 username', 403, res.statusCode);
		}
		
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user2!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { email: 'hacked@evil.com' }
			});
			test('OWNERSHIP', 'User1 cannot modify User2 email', 403, res.statusCode);
		}
		
		// User1 intenta cambiar password de User2
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user2!.id}/password`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { newPasswordHash: bcrypt.hashSync('hacked', 10) }
			});
			test('OWNERSHIP', 'User1 cannot change User2 password', 403, res.statusCode);
		}
		
		// User1 intenta eliminar User2
		{
			const res = await app.inject({
				method: 'DELETE',
				url: `/api/users/${testUsers.user2!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('OWNERSHIP', 'User1 cannot delete User2', 403, res.statusCode);
		}
		
		// User2 intenta modificar User1 (bidireccional)
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user2!.token}` },
				payload: { username: 'hacked_by_user2' }
			});
			test('OWNERSHIP', 'User2 cannot modify User1', 403, res.statusCode);
		}
		
		// ====================================================================
		// SUBJECT 9: SECURITY - NO AUTHENTICATION
		// ====================================================================
		console.log('\n[SECURITY - NO AUTHENTICATION]');
		
		{
			const endpoints = [
				{ method: 'GET', url: `/api/users/${testUsers.user1!.id}`, desc: 'GET' },
				{ method: 'PUT', url: `/api/users/${testUsers.user1!.id}`, payload: { username: 'hack' }, desc: 'PUT w/username' },
				{ method: 'PUT', url: `/api/users/${testUsers.user1!.id}`, payload: { email: 'newEmail1234@test.com' }, desc: 'PUT w/email' },
				{ method: 'PUT', url: `/api/users/${testUsers.user1!.id}`, payload: { avatar: 'http://avatar.com/avatar.jpg' }, desc: 'PUT w/avatar' },
				{ method: 'PUT', url: `/api/users/${testUsers.user1!.id}/password`, payload: { newPasswordHash: bcrypt.hashSync('hack', 10) }, desc: 'PUT password' },
				{ method: 'DELETE', url: `/api/users/${testUsers.user1!.id}`, desc: 'DELETE' }
			];

			for (const ep of endpoints) {
				const res = await app.inject({
					method: ep.method as any,
					url: ep.url,
					payload: ep.payload
				});
				test('NO AUTH', `${ep.desc} without token returns 401`, 401, res.statusCode);
			}
		}
		
		// ====================================================================
		// SUBJECT 10: SECURITY - INVALID TOKEN
		// ====================================================================
		console.log('\n[SECURITY - INVALID TOKEN]');
		
		{
			const invalidTokens = [
				{ token: 'Bearer not-a-jwt', desc: 'Malformed token' },
				{ token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UifQ.INVALID', desc: 'Invalid signature' },
				{ token: `Bearer ${testUsers.user1!.token}EXTRA`, desc: 'Modified token' },
				{ token: testUsers.user1!.token, desc: 'Token without Bearer' },
				{ token: '', desc: 'Empty Authorization' },
				{ token: 'Bearer', desc: 'Bearer without token' }
			];
			
			for (const t of invalidTokens) {
				const res = await app.inject({
					method: 'PUT',
					url: `/api/users/${testUsers.user1!.id}`,
					headers: { 'Authorization': t.token },
					payload: { username: 'hack' }
				});
				test('INVALID TOKEN', `${t.desc} returns 401`, 401, res.statusCode);
			}
		}
		
		// ====================================================================
		// SUBJECT 11: EDGE CASES
		// ====================================================================
		console.log('\n[EDGE CASES]');
		
		// Empty body
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: {}
			});
			test('EDGE CASE', 'PUT with empty body returns 400', 400, res.statusCode);
		}
		
		// Null values
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { username: null }
			});
			test('EDGE CASE', 'PUT username null returns 400', 400, res.statusCode);
		}
		
		// Valid UUID but non-existent
		{
			const res = await app.inject({
				method: 'GET',
				url: '/api/users/00000000-0000-0000-0000-000000000000',
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` }
			});
			test('EDGE CASE', 'Valid UUID non-existent returns 404', 404, res.statusCode);
		}
		
		// Attempt to modify ID
		{
			const newId = Utils.generateUserId();
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user1!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { id: newId, username: 'valid' }
			});
			
			if (res.statusCode === 200) {
				const body = res.json();
				test('EDGE CASE', 'ID cannot be modified', testUsers.user1!.id, body.id);
			}
		}
		
		// ====================================================================
		// SUBJECT 12: CONCURRENT OPERATIONS
		// ====================================================================
		console.log('\n[CONCURRENT OPERATIONS]');
		
		// Multiple updates to same user
		{
			const promises = [
				app.inject({
					method: 'PUT',
					url: `/api/users/${testUsers.user1!.id}`,
					headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
					payload: { username: 'concurrent1' }
				}),
				app.inject({
					method: 'PUT',
					url: `/api/users/${testUsers.user1!.id}`,
					headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
					payload: { username: 'concurrent2' }
				}),
				app.inject({
					method: 'PUT',
					url: `/api/users/${testUsers.user1!.id}`,
					headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
					payload: { username: 'concurrent3' }
				})
			];
			
			const responses = await Promise.all(promises);
			const successCount = responses.filter(r => r.statusCode === 200).length;
			test('CONCURRENT', 'At least one concurrent update succeeds', true, successCount >= 1);
			test('CONCURRENT', 'All concurrent updates succeeded', true, successCount === 3);
		}
		
		// Duplicate username creation
		{
			const promises = [
				app.inject({
					method: 'POST',
					url: '/api/users',
					payload: { username: 'duplicate_test', email: 'dup1@test.com', password: 'Pass123!', avatar: 'https://image.com/image.png' }
				}),
				app.inject({
					method: 'POST',
					url: '/api/users',
					payload: { username: 'duplicate_test', email: 'dup2@test.com', password: 'Pass123!', avatar: 'https://image.com/image.png' }
				})
			];
			
			const responses = await Promise.all(promises);
			const successCount = responses.filter(r => r.statusCode === 201).length;
			const conflictCount = responses.filter(r => r.statusCode === 409).length;
			
			test('CONCURRENT', 'Only one duplicate succeeds', 1, successCount);
			test('CONCURRENT', 'Other duplicate returns 409', 1, conflictCount);
		}
		
		// ====================================================================
		// SUBJECT 13: ABUSE PREVENTION
		// ====================================================================
		console.log('\n[ABUSE PREVENTION]');
		
		// Multiple ownership violations
		{
			let failures = 0;
			for (let i = 0; i < 5; i++) {
				const res = await app.inject({
					method: 'PUT',
					url: `/api/users/${testUsers.user2!.id}`,
					headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
					payload: { username: `attempt_${i}` }
				});
				if (res.statusCode === 403) failures++;
			}
			test('ABUSE', 'Multiple violations consistently return 403', 5, failures);
		}
		
		// No sensitive data leaks
		{
			const res = await app.inject({
				method: 'PUT',
				url: `/api/users/${testUsers.user2!.id}`,
				headers: { 'Authorization': `Bearer ${testUsers.user1!.token}` },
				payload: { username: 'hack' }
			});
			
			if (res.statusCode === 403) {
				const body = JSON.stringify(res.json()).toLowerCase();
				const noLeaks = !body.includes('passwordhash') && !body.includes('token') && !body.includes('secret');
				test('ABUSE', 'Error responses do not leak sensitive data', true, noLeaks);
			}
		}
		
		// ====================================================================
		// TEARDOWN
		// ====================================================================
		await teardownTestUsers();
		
		// ====================================================================
		// SUMMARY
		// ====================================================================
		console.log('\n' + '='.repeat(50));
		const passed = results.filter(r => r.passed).length;
		const failed = results.filter(r => !r.passed).length;
		console.log(`📊 TOTAL: ${results.length} | ✅ PASSED: ${passed} | ❌ FAILED: ${failed}`);
		console.log('='.repeat(50));
		
		if (failed > 0) {
			console.log('\n❌ FAILED TESTS:');
			results.filter(r => !r.passed).forEach((r, idx) => {
				console.log(`  ${idx + 1}. [${r.subject}] ${r.test}`);
				console.log(`     Expected: ${r.expected}, Got: ${r.actual}`);
			});
		}
		
		process.exitCode = failed > 0 ? 1 : 0;
		
	} catch (error) {
		console.error('❌ FATAL ERROR:', error);
		process.exit(1);
	} finally {
		if (app) await app.close();
	}
	process.env.NODE_MODE = 'development';
}

// ============================================================================
// RUN
// ============================================================================

runTests().catch(error => {
	console.error('❌ UNHANDLED ERROR:', error);
	process.exit(1);
});
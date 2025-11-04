import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { Utils } from '../../shared/src';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../src/connection';

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
	const status = passed ? '✓' : '✗';
	const output = passed 
	? `${"=".repeat(40)}\n${status} ${testCounter}. ${name}`
	: `${status} ${testCounter}. ${name} | Expected: ${expected} | Got: ${actual}`;
	console.log(output);
}

// ============================================================================
// MAIN
// ============================================================================

async function runTests() {
	let app: FastifyInstance | null = null;
	
	try {
		// SETUP
		app = buildApp();
		await app.ready();
		
		// Limpiar DB
		const db = getDatabase();
		db.prepare('DELETE FROM users').run();
		
		const juanUser = {
			username: `Juan`,
			email: `Juan@example.com`,
			passwordHash: bcrypt.hashSync('pass123', 10),
			avatar: 'https://example.com/avatar.png'
		};

		// Identificar logger
		console.log(`\n${"o".repeat(10)} Identificar Logger ${"o".repeat(10)}`)
		console.log('🔍 Logger type:', app.log.constructor.name);
		console.log('🔍 Logger level:', app.log.level);
		console.log('');

		let userId: string = '';
		
		console.log("\n" + "o".repeat(40));
		console.log("o            COMENZANDO TEST           o");
		console.log("o".repeat(40) + "\n");
		
		// ====================================================================
		// subject 1: CREATE
		// ====================================================================
		console.log('[CREATE USER]');
		
		// 1.1 Create JUAN
		{
			const res = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: juanUser
			});
			
			test('CREATE', 'Create valid user', 201, res.statusCode);
			
			if (res.statusCode === 201) {
				const body = res.json();
				userId = body.id;
				test('CREATE', 'Has ID', true, !!body.id);
				test('CREATE', 'Username matches', juanUser.username, body.username);
				test('CREATE', 'Email matches', juanUser.email, body.email);
				test('CREATE', 'No password in response', undefined, body.passwordHash);
			}
		}
		
		// 1.2 Duplicate email
		{
			const res = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: {
					username: `otroUser`,
					email: juanUser.email,
					passwordHash: bcrypt.hashSync('unPasswword')
				}
			});
			
			test('CREATE', 'Duplicate email returns 409', 409, res.statusCode);
		}
		
		// 1.3 Duplicate username
		{
			const res = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: {
					username: juanUser.username,
					email: `otherUser@example.com`,
					passwordHash: bcrypt.hashSync("morePass")
				}
			});
			
			test('CREATE', 'Duplicate username returns 409', 409, res.statusCode);
		}
		
		// 1.4 Missing required field
		app.log.level = 'fatal';
		{
			let res14 = undefined;
			try {
				
				res14 = await app.inject({
					method: 'POST',
					url: '/api/users',
					payload: {
						username: `unoSinEmail`,
						passwordHash: bcrypt.hashSync("sinEmail")
						// missing email
					}
				});
			} catch (err) {
				console.log (`${"!".repeat(40)}\nError catch at 1.4`);
			}			
			test('CREATE', 'Missing email returns 400', 400, res14?.statusCode || undefined);
			app.log.level = 'info';
		}
		/*
		// ====================================================================
		// subject 2: READ
		// ====================================================================
		console.log('\n[READ USER]');
		
		// 2.1 Get by ID
		{
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/${userId}`
		});
		
		test('READ', 'Get by ID returns 200', 200, res.statusCode);
		
		if (res.statusCode === 200) {
		const body = res.json();
		test('READ', 'ID matches', userId, body.id);
		}
		}
		
		// 2.2 Get non-existent
		{
		const fakeId = Utils.generateUserId();
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/${fakeId}`
		});
		
		test('READ', 'Non-existent ID returns 404', 404, res.statusCode);
		}
		
		// 2.3 Get by username
		{
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/username/${juanUser.username}`
		});
		
		test('READ', 'Get by username returns 200', 200, res.statusCode);
		}
		
		// 2.4 Username case-insensitive
		{
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/username/${juanUser.username.toUpperCase()}`
		});
		
		test('READ', 'Username search case-insensitive', 200, res.statusCode);
		}
		
		// ====================================================================
		// subject 3: CHECK AVAILABILITY
		// ====================================================================
		console.log('\n[CHECK AVAILABILITY]');
		
		// 3.1 Check available username
		{
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/check-username/free${t}` // 10 chars max
		});
		
		test('CHECK', 'Available username returns 200', 200, res.statusCode);
		
		if (res.statusCode === 200) {
		const body = res.json();
		test('CHECK', 'Username is available', true, body.available);
		}
		}
		
		// 3.2 Check taken username
		{
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/check-username/${juanUser.username}`
		});
		
		test('CHECK', 'Taken username returns 200', 200, res.statusCode);
		
		if (res.statusCode === 200) {
		const body = res.json();
		test('CHECK', 'Username not available', false, body.available);
		}
		}
		
		// 3.3 Check available email
		{
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/check-email/free${t}@example.com`
		});
		
		test('CHECK', 'Available email returns 200', 200, res.statusCode);
		
		if (res.statusCode === 200) {
		const body = res.json();
		test('CHECK', 'Email is available', true, body.available);
		}
		}
		
		// 3.4 Check taken email
		{
		const res = await app.inject({
		method: 'GET',
		url: `/api/users/check-email/${juanUser.email}`
		});
		
		test('CHECK', 'Taken email returns 200', 200, res.statusCode);
		
		if (res.statusCode === 200) {
		const body = res.json();
		test('CHECK', 'Email not available', false, body.available);
		}
		}
		
		// ====================================================================
		// subject 4: UPDATE
		// ====================================================================
		console.log('\n[UPDATE USER]');
		
		// 4.1 Update username only
		{
		const res = await app.inject({
		method: 'PUT',
		url: `/api/users/${userId}`,
		payload: {
		username: `new${t}` // 9 chars max
		// NO email, NO avatar - campos opcionales
		}
		});
		
		test('UPDATE', 'Update username returns 200', 200, res.statusCode);
		
		if (res.statusCode === 200) {
		const body = res.json();
		test('UPDATE', 'Username updated', `new${t}`, body.username);
		test('UPDATE', 'Email unchanged', juanUser.email, body.email);
		}
		}
		
		// 4.2 Update to duplicate username
		{
		// Create second user
		const user2 = await app.inject({
		method: 'POST',
		url: '/api/users',
		payload: {
		username: `u2${t}`, // 8 chars max
		email: `u2${t}@example.com`,
		passwordHash: juanUser.passwordHash
		}
		});
		
		if (user2.statusCode === 201) {
		const user2Id = user2.json().id;
		
		// Try to update to existing username
		const res = await app.inject({
		method: 'PUT',
		url: `/api/users/${user2Id}`,
		payload: {
		username: `new${t}` // Already taken by first user
		}
		});
		
		test('UPDATE', 'Duplicate username returns 409', 409, res.statusCode);
		
		// Cleanup
		await app.inject({
		method: 'DELETE',
		url: `/api/users/${user2Id}`
		});
		} else {
			test('UPDATE', 'Setup user2 for test', 201, user2.statusCode);
		}
		}
		
		// 4.3 Update non-existent user
		{
		const fakeId = Utils.generateUserId();
		const res = await app.inject({
		method: 'PUT',
		url: `/api/users/${fakeId}`,
		payload: {
		username: 'whatever'
		}
		});
		
		test('UPDATE', 'Non-existent user returns 404', 404, res.statusCode);
		}
		
		// 4.4 Update email only
		{
		const res = await app.inject({
		method: 'PUT',
		url: `/api/users/${userId}`,
		payload: {
		email: `newemail${t}@example.com`
		// NO username, NO avatar
		}
		});
		
		test('UPDATE', 'Update email returns 200', 200, res.statusCode);
		}
		
		// ====================================================================
		// subject 5: UPDATE PASSWORD
		// ====================================================================
		console.log('\n[UPDATE PASSWORD]');
		
		// 5.1 Update password
		{
		const res = await app.inject({
		method: 'PUT',
		url: `/api/users/${userId}/password`,
		payload: {
		newPasswordHash: bcrypt.hashSync('newpass', 10)
		}
		});
		
		test('PASSWORD', 'Update password returns 204', 204, res.statusCode);
		test('PASSWORD', 'Empty body', '', res.body);
		}
		
		// 5.2 Update password non-existent
		{
		const fakeId = Utils.generateUserId();
		const res = await app.inject({
		method: 'PUT',
		url: `/api/users/${fakeId}/password`,
		payload: {
		newPasswordHash: bcrypt.hashSync('newpass', 10)
		}
		});
		
		test('PASSWORD', 'Non-existent user returns 404', 404, res.statusCode);
		}
		
		// ====================================================================
		// subject 6: DELETE
		// ====================================================================
		console.log('\n[DELETE USER]');
		
		// 6.1 Delete existing user
		{
		const res = await app.inject({
		method: 'DELETE',
		url: `/api/users/${userId}`
		});
		
		test('DELETE', 'Delete user returns 204', 204, res.statusCode);
		test('DELETE', 'Empty body', '', res.body);
		
		// Verify deleted
		const check = await app.inject({
		method: 'GET',
		url: `/api/users/${userId}`
		});
		
		test('DELETE', 'Deleted user not found', 404, check.statusCode);
		}
		
		// 6.2 Delete non-existent
		{
		const fakeId = Utils.generateUserId();
		const res = await app.inject({
		method: 'DELETE',
		url: `/api/users/${fakeId}`
		});
		
		test('DELETE', 'Non-existent user returns 404', 404, res.statusCode);
		}
		
		STOP */
		// ====================================================================
		// SUMMARY
		// ====================================================================
		
		/*
		console.log('\n' + '='.repeat(50));
		const passed = results.filter(r => r.passed).length;
		const failed = results.filter(r => !r.passed).length;
		console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
		
		if (failed > 0) {
		console.log('\nFAILED TESTS:');
		results.filter(r => !r.passed).forEach(r => {
		console.log(`  ${r.test}: Expected ${r.expected}, got ${r.actual}`);
		});
		}
		
		process.exitCode = failed > 0 ? 1 : 0;
		*/
		
	} catch (error) {
		console.error('FATAL:', error);
		process.exitCode = 1;
	} finally {
		if (app) await app.close();
	}
}

// RUN
runTests().catch(error => {
	console.error('UNHANDLED:', error);
	process.exit(1);
});

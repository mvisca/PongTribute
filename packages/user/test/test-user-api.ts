import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { buildApp } from '../src/app';
import { UserTypes, Utils } from '../../shared/src';
import { getDatabase } from '../src/connection';
import { userRoutes } from '../src/routes/user.publicRoutes';

// ============================================================================
// TODO
// ============================================================================
/*
Revisar test Anonymize, por que esta llegando un 201 si explicitamente se envia un 204
*/

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
		
		// Identificar logger
		console.log(`\n${"o".repeat(10)} Identificar Logger ${"o".repeat(10)}`)
		console.log('🔍 Logger type:', app.log.constructor.name);
		console.log('🔍 Logger level:', app.log.level);
		
		let userId: string = '';
		
		console.log("\n" + "o".repeat(40));
		console.log("o            COMENZANDO TEST           o");
		console.log("o".repeat(40) + "\n");
		
		// ====================================================================
		// subject 1: CREATE
		// ====================================================================
		console.log('[CREATE USER]');
		
		const createJuan = {
			username: `JUAN`,
			email: `Juan@example.com`,
			passwordHash: bcrypt.hashSync('pass123', 10),
			avatar: 'https://example.com/avatar.png'
		};
		
		let juanUser = undefined;
		
		// 1.1 Create JUAN
		{
			const res = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: createJuan
			});
			
			test('CREATE', 'Create valid user', 201, res.statusCode);
			
			if (res.statusCode === 201) {
				juanUser = res.json(); 
				userId = juanUser.id;
				test('CREATE', 'Has ID', true, !!juanUser.id);
				test('CREATE', 'Username matches', createJuan.username, juanUser.username);
				test('CREATE', 'Email matches', createJuan.email, juanUser.email);
				test('CREATE', 'No password in response', undefined, juanUser.passwordHash);
			}
			
			console.log('Output res.json', res.json());
		}
		
		// 1.2 Duplicate email
		{
			const res = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: {
					username: `otroUser`,
					email: createJuan.email,
					avatar: 'http://avatar.com/image',
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
					username: createJuan.username,
					email: `otherUser@example.com`,
					avatar: 'http://avatar.com/image',
					passwordHash: bcrypt.hashSync("morePass")
				}
			});
			
			test('CREATE', 'Duplicate username returns 409', 409, res.statusCode);
		}
		
		// 1.4 Missing required field
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
		}
		
		console.log('\n[VALIDATION - USERNAME]');
		
		// Test 1: Username muy corto
		const res1 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'ab',
				email: 'test@test.com',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('USERNAME', 'Username corto returns 400', 400, res1.statusCode);
		
		// Test 2: Username muy largo
		const res2 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'a'.repeat(21),
				email: 'test@test.com',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('USERNAME', 'Username largo returns 400', 400, res2.statusCode);
		
		// Test 3: Username con espacios
		const res3 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'user name',
				email: 'test@test.com',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('USERNAME', 'Username con espacio returns 400', 400, res3.statusCode);
		
		// Test 4: Username con caracteres especiales
		const res4 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'user@123',
				email: 'test@test.com',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('USERNAME', 'Username con caracteres especiales returns 400', 400, res4.statusCode);
		
		// Test 5: Username vacío
		const res5 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: '', 
				email: 'test@test.com',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('USERNAME', 'Username vacio returns 400', 400, res5.statusCode);
		
		console.log('\n[VALIDATION - EMAIL]');
		
		// Test 6: Email sin @
		const res6 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'testuser',
				email: 'notanemail',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('EMAIL', 'Email sin arroba returns 400', 400, res6.statusCode);
		
		// Test 7: Email incompleto
		const res7 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'testuser',
				email: 'test@',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('EMAIL', 'Email sin dominio returns 400', 400, res7.statusCode);
		
		const res8 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'testuser',
				email: 'test @example.com',
				passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
			}
		});
		
		test('EMAIL', 'Email con espacios especiales returns 400', 400, res8.statusCode);
		
		console.log('\n[VALIDATION - PASSWORD]');
		
		// Test 9: Password hash muy corto
		const res9 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'testuser',
				email: 'test@test.com',
				passwordHash: 'short'
			}
		});
		
		test('PASSWORD', 'PasswordHash corto returns 400', 400, res9.statusCode);
		
		// Test 10: Password hash formato incorrecto
		const res10 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'testuser',
				email: 'test@test.com',
				passwordHash: 'a'.repeat(60)  // ❌ 60 chars pero no bcrypt
			}
		});
		
		test('PASSWORD', 'PasswordHash malformado returns 400', 400, res10.statusCode);
		
		// Test 11: Password hash vacío
		const res11 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {
				username: 'testuser',
				email: 'test@test.com',
				passwordHash: ''  // ❌ Vacío
			}
		});
		
		test('PASSWORD', 'PasswordHash vacío returns 400', 400, res11.statusCode);
		
		
		console.log('\n[VALIDATION - CAMPOS OBLIGATOORIOS]');
		
		const fullTestUser = {
			username: 'Dido',
			email: 'test@test.com',
			avatar: 'http://dido.com/avatar',
			passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjefO0Z/mYYP1k4FkeNF2FPZp9w7W2'
		};
		
		const { username, ...sinUsername } = fullTestUser;
		const { email, ...sinEmail } = fullTestUser;
		const { passwordHash, ... sinPasswordHash } = fullTestUser;
		
		// Test 12: Sin username
		const res12 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: { ...sinUsername }
		});
		test('CAMPOS OBLIGATORIOS', 'CreateUser sin username returns 400', 400, res12.statusCode);
		
		// Test 14: Sin email
		const res14 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: { ...sinEmail }
		});
		test('CAMPOS OBLIGATORIOS', 'CreateUser sin email returns 400', 400, res14.statusCode);
		
		// Test 15: Sin PasswordHash
		const res15 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: { ...sinPasswordHash }
		});
		test('CAMPOS OBLIGATORIOS', 'CreateUser sin passwordHash returns 400', 400, res15.statusCode);
		
		// Test 16: Body vacío
		const res16 = await app.inject({
			method: 'POST',
			url: '/api/users',
			payload: {}
		});
		test('CAMPOS OBLIGATORIOS', 'CreateUser sin body returns 400', 400, res16.statusCode);
				
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
				url: `/api/users/username/${createJuan.username}`
			});
			
			test('READ', 'Get by username returns 200', 200, res.statusCode);
		}
		
		// 2.4 Username case-insensitive
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/username/${createJuan.username.toUpperCase()}`
			});
			
			test('READ', 'Username search case-insensitive', 200, res.statusCode);
		}
		
		// Test 2.5: UUID inválido en GET
		const res17 = await app.inject({
			method: 'GET',
			url: '/api/users/not-a-uuid'
		});
		
		test('READ', 'GetUser con UUID invalido returns 400', 400, res17.statusCode);
		
		// ====================================================================
		// subject 3: CHECK AVAILABILITY
		// ====================================================================
		console.log('\n[CHECK AVAILABILITY]');
		
		// 3.1 Check available username
		{
			const res = await app.inject({
				method: 'GET',
				url: `/api/users/check-username/non-username` // 10 chars max
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
				url: `/api/users/check-username/${createJuan.username}`
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
				url: `/api/users/check-email/free-email@example.com`
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
				url: `/api/users/check-email/${createJuan.email}`
			});
			
			test('CHECK', 'Taken email returns 200', 200, res.statusCode);
			
			if (res.statusCode === 200) {
				const body = res.json();
				test('CHECK', 'Email not available', false, body.available);
				console.log(body);
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
				url: `/api/users/${juanUser.id}`,
				payload: {
					username: `ElNuevoJuan`
					// NO email, NO avatar - campos opcionales
				}
			});
			
			test('UPDATE', 'Update username returns 200', 200, res.statusCode);
			
			if (res.statusCode === 200) {
				const body = res.json();
				test('UPDATE', 'Username updated', `ElNuevoJuan`, body.username);
				test('UPDATE', 'Email unchanged', juanUser.email, body.email);
			}
			juanUser = res.json();
		}
		
		// 4.2 Update to duplicate username
		{
			const createOtro = {
				username: `otroUser`,
				email: `otro@example.com`,
				passwordHash: bcrypt.hashSync('passwordHash'),
				avatar: 'http://avatar.com/avatar.jpg'
			};
			
			// Crear otr user (existe JUAN)
			const res1 = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: createOtro
			});
			
			test('CREATE', 'Create valid user', 201, res1.statusCode);
			
			if (res1.statusCode === 201) {
				const otroUser = res1.json();
				const otroId = otroUser.id;
				
				// Update a nombre tomado
				const res2 = await app.inject({
					method: 'PUT',
					url: `/api/users/${otroId}`,
					payload: {
						username: `ElNuevoJuan` // Ya está en uso
					}
				});
				
				test('UPDATE', 'Duplicate username returns 409', 409, res2.statusCode);
				
				// Cleanup
				await app.inject({
					method: 'DELETE',
					url: `/api/users/${otroId}`
				});
			} else {
				test('UPDATE', 'Setup otroUser for test', 201, res1.statusCode);
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
				url: `/api/users/${juanUser.id}`,
				payload: {
					email: `otroEmailJuan@example.com`
					// NO username, NO avatar
				}
			});
			
			test('UPDATE', 'Update email returns 200', 200, res.statusCode);
		}
		
		// 4.5: UUID inválido en PUT
		const res18 = await app.inject({
			method: 'PUT',
			url: '/api/users/not-a-uuid'
		});
		test('UPDATE', 'PutUser con UUID invalido returns 400', 400, res18.statusCode);
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
		// subject 6: ANONIMIZE
		// ====================================================================
		
		console.log('\n[ANONIMIZE USER]');
		{
			const createLulu = {
				username: `Lulu`,
				email: `Lulu@example.com`,
				passwordHash: bcrypt.hashSync('pass123', 10),
				avatar: null
			};
			
			const res = await app.inject({
				method: 'POST',
				url: '/api/users',
				payload: createLulu
			});
			
			console.log('Created Lulu: ', res.json());
			
			if (res.statusCode === 201) {
				let luluUser = res.json();
				const luluId = luluUser.id;
				console.log('LuluUser: ', luluUser);
				
				const anony = await app.inject({
					method: 'PUT',
					url: `/api/users/${luluId}/anonymize`
				});
					
				test('ANONYMIZE', 'User anonymized', 204, anony.statusCode);

				const res19 = await app.inject({
					method: 'GET',
					url: `/api/users/${luluId}`
				});

				test('ANONYMIZE', 'Should not find user', 404, res19.statusCode); 
			}
		}
		
		// ====================================================================
		// subject 7: DELETE
		// ====================================================================
		console.log('\n[DELETE USER]');
		
		// 7.1 Delete existing user
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
		
		// 7.2 Delete non-existent
		{
			const fakeId = Utils.generateUserId();
			const res = await app.inject({
				method: 'DELETE',
				url: `/api/users/${fakeId}`
			});
			
			test('DELETE', 'Non-existent user returns 404', 404, res.statusCode);
		}
		
		// ====================================================================
		// SUMMARY
		// ====================================================================
		
		
		console.log('\n' + '='.repeat(50) + '\n');
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
		
	} catch (error) {
		console.error('WARNING:', error);
		process.exit(1);
	} finally {
		if (app) await app.close();
	}
}

// RUN
runTests().catch(error => {
	console.error('UNHANDLED:', error);
	process.exit(1);
});

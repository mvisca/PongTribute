// ============================================================================
// TEST USER REPOSITORY
// ============================================================================

import { AuthService } from '../src/services/AuthService';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ debug: false });
const userEmail = 'email@test.com';
const userPassword = '1234abcd';
const userPasswordHash = bcrypt.hashSync(userPassword, 10);

async function createTestUser() {
	
	const res1 = await fetch(
		`${process.env.USER_SERVICE_URL}/api/users/check-email/${userEmail}`
	);
	
	const checkRes = await res1.json();

	console.log(checkRes);

	if (checkRes.available === true) {
		
		const response = await fetch(
			`${process.env.USER_SERVICE_URL}/api/users`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: 'tester',
					email: userEmail,
					avatar: 'http://image.test/test',
					passwordHash: userPasswordHash
				})
			}
		);

		if (!response.ok) {
			const error = await response.json();
			console.log('error creando usuario: ', error);
			throw new Error('Setup failed');
		}

		console.log('Usuario creado:');
	} else {
		console.log('Usuario existente:');
	}
	
	const user = await fetch(
		`${process.env.USER_SERVICE_URL}/api/users/by-email/${userEmail}`
	)
	
	if (!user) {
		console.log('Fallo al recuperar usuario con email:', userEmail);
		process.exit(1);
	}

	console.log(user);

	return { email: userEmail, password: userPassword };
}

async function testLogin() {
	const service = new AuthService();
	const result = await service.login(userEmail, userPassword);
	
	if (result) {
		console.log(`\n${'='.repeat(15)} Login OK! ${'='.repeat(15)}`);
		console.log(result);
	}
}

async function main() {

	console.log('\n' + '='.repeat(15) + 'Create user IN' + '='.repeat(15));
	await createTestUser();
	console.log('='.repeat(15) + 'Create user OUT' + '='.repeat(15) + '\n');

	console.log('\n' + '='.repeat(15) + 'Test api IN' + '='.repeat(15));
	await testLogin();
	console.log('='.repeat(15) + 'Test api OUT' + '='.repeat(15) + '\n');
}

main();
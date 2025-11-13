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

	const exists = await fetch(
		`${process.env.USER_SERVICE_URL}/api/users/check-email/${userEmail}`
	);

	if (exists) return;

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

	const user = await response.json();
	console.log('Usuario creado: ', user);

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

createTestUser();
testLogin();
// ============================================================================
// TEST USER REPOSITORY
// ============================================================================

import { AuthService } from '../src/services/AuthService';
import bcrypt from 'bcryptjs';
import { SharedEnv } from '@transcendence/shared';

const userEmail = 'email@test.com';
const userPassword = '1234abcd';
const userPasswordHash = bcrypt.hashSync(userPassword, 10);

async function createTestUser() {
	console.log('Test-Login-Service');
	const sharedEnv = SharedEnv.build();

	const res1 = await fetch(
		`${sharedEnv.USER_SERVICE_URL}/api/users/check-email/${userEmail}`,
	);
	
	const checkRes = await res1.json();

	console.log('\nCheck Res');
	console.log(checkRes);

	if (checkRes.available === true) {
		
		const response = await fetch(
			`${sharedEnv.USER_SERVICE_URL}/api/users`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: 'tester',
					email: userEmail,
					avatar: 'http://image.test/test',
					password: userPassword
				})
			}
		);

		if (!response.ok) {
			const error = await response.json();
			console.log('\nError creando usuario: ', error);
			throw new Error('Setup failed');
		}

		console.log('\nUsuario creado');
	} else {
		console.log('\nUsuario existente');
	}

	const userResponse = await fetch(
		`${sharedEnv.USER_SERVICE_URL}/internal/users/by-email/${userEmail}`,
		{
			headers: {
				'X-Service-Secret': `${sharedEnv.SERVICE_SECRET}`
			}
		}
	);

	if (!userResponse) {
		console.log('Fallo al recuperar usuario con email:', userEmail);
		process.exit(1);
	}

	const resUser = await userResponse.json();
	console.log(resUser);

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
	await createTestUser();
	await testLogin();
}

main();
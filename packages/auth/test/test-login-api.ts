import { buildApp } from '../src/app';
import { TestUtils, TestConstants } from '@transcendence/shared';

async function testLogin() {
	const app = buildApp();

	const usersKeys = TestConstants.TEST_USERS_KEYS;
	const userSession = await TestUtils.setupUser(usersKeys[0]);

	if(!userSession) {
		console.log('\nError en setupUser')
		return;
	}
	console.log('\nUsuario configurado OK');

	const res = await app.inject({
		method: 'POST',
		url: '/api/auth/login',
		payload: {
			email: `${userSession.user.email}`,
			password: `${TestConstants.TEST_USERS.user1.password}`
		}
	});

	const resParsed = await res.json();
	console.log('Session: ', resParsed); 
}

testLogin();
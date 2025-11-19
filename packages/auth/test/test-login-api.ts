import { buildApp } from '../src/app';
import { TestUtils, TestConstants } from '@transcendence/shared';

async function testLogin() {
	const app = buildApp();

	const usersKeys = TestConstants.TEST_USERS_KEYS;
	const user1 = await TestUtils.setupUser(usersKeys[0]);

	if(!user1) {
		return;
	}

	const res1 = await app.inject({
		method: 'GET',
		url: `http://localhost:3001/api/user/check-email/${user1.user.email}`
	});

	console.log(`\nResponse.statu = ${res1.statusCode}`);

	const res1json = await res1.json();
	console.log("\nRES1JSON");
	console.log(`${res1json}`);

	const res2 = await app.inject({
		method: 'POST',
		url: '/api/auth/login',
		payload: {
			email: `${user1.user.email}`,
			password: `${TestConstants.TEST_USERS.user1.password}`
		}
	});

	console.log(res2.statusCode, res2.json());
}

testLogin();
import { buildApp } from '../src/app';

async function testLogin() {
	const app = buildApp();

	const userEmail = 'email@test.com';
	const userPassword = '1234abcd';

	const res1 = await app.inject({
		method: 'GET',
		url: `/localhost:3001/api/user/check-email/${userEmail}`
	});

	const res = await app.inject({
		method: 'POST',
		url: '/api/auth/login',
		payload: { email: userEmail, password: userPassword}
	});

	console.log(res.statusCode, res.json());
}

testLogin();
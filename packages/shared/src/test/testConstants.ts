// packages/shared/src/test/testConst
import { UserTypes } from '../index.js';

export namespace TestConstants {
	
	export const TEST_USERS = {
		user1: {
			username: 'juan_test',
			email: 'juan@test.com',
			avatar: 'http://fotos.com/fotos.png',
			password: 'passwordA1234'
		},
		user2: {
			username: 'maria_test',
			email: 'maria@test.com',
			avatar: 'http://fotos.com/fotos.png',
			password: 'passwordA1234'
		},
		user3: {
			username: 'foo_test',
			email: 'foo@test.com',
			avatar: 'http://fotos.com/fotos.png',
			password: 'passwordA1234'
		}
	} satisfies Record<string, UserTypes.CreateUserInput>;
	
	export type TestUserKey = keyof typeof TEST_USERS;
	export const TEST_USERS_KEYS = Object.keys(TEST_USERS) as TestUserKey[];	
}
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   test-user-repository.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 21:46:12 by m                 #+#    #+#             */
/*   Updated: 2025/10/21 15:19:57 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { getDatabase, closeDatabase } from '../connection';
import { SQLiteUserRepository } from '../repositories/SQLiteUserRepository';
import { generateUserId, UserId, Email, UserLoggedInEvent } from '../../shared';
import * as UserTypes from '../../shared/types/user.types';
import assert from "node:assert";
import { UserMapper } from '../mappers/UserMapper';

const SQL = SQLiteUserRepository;

function userExists(user: UserTypes.User | UserTypes.UserResponse | null) {
	!!user
		? console.log('User recuperado: \
			', user)
		: console.log('No existe');
}

async function testUserRepository() {
	console.log("Iniciando test de UserRepository\n");
	
	// Setup
	const db = getDatabase();
	const userRepo = new SQLiteUserRepository(db);
	console.log('Conexión DB establecida');
	
	// TEST 1 : Crear Usuario
	console.log('\nTest 1: Crear usuario');

	let alice: UserTypes.User | null = null;
	try { 	
		const createUserData: UserTypes.CreateUserData = {
			username: "Alice",
			email: "alice@test.com",
			passwordHash: `Timesamped_${Date.now()}`, // simulado ya hasheado
			avatar: 'https://image.com/myimage.png'	
		} as UserTypes.CreateUserData;	
		
		let alice = await userRepo.create(createUserData);
		console.warn('Alice se creó');
	} catch {
		console.warn('Alice ya está en la base de datos y no se creó');
	} finally {
		if (!alice) alice = await userRepo.findByUsername('Alice');
		console.log('Recuprada Alice de la base de datos');
	}
	
	if (alice) userExists(alice);
	else process.exit(1);
	
	// TEST 2 : Leer Usuario
	console.log('\nTest 2: findByEmail');
	console.log('Es UserType.User con \'password_hash\' porque es el campo usado para login')

	console.log('\nTest 2.1: User existe - Alice');
	const aliceByEmail = await userRepo.findByEmail('alice@test.com' as Email);
	!!aliceByEmail
		? console.log(`User recuperad: `, aliceByEmail)
		: console.log('No existe');

	console.log('\nTest 2.2: User NO existe - undefined | null');
	const noExsistByEmail = await userRepo.findByEmail('no-alice@test.com' as Email) as UserTypes.User;
	console.log(!!noExsistByEmail ? 'User recuperado con email: ' + noExsistByEmail : 'No existe');

	console.log('Fin test findByEmail\n');

	// TEST 3 : Leer usuario
	console.log('\nTest 3: findById')
	
	console.log('\nTest 3.1: User existe - Alice');
	const aliceById = await userRepo.findById(alice.id);
	userExists(aliceById);

	console.log('\nTest 3.2: User NO existe - undefined | null');
	const noExsistById = await userRepo.findById("sdfjerjfljflaskldf" as UserId);
	userExists(aliceById);

	console.log('Fin test findById\n');

	// TEST 4 : Leer Usuario
	console.log('\nTest 4: findByUsername');
	console.log('Es UserType.User con \'password_hash\' porque es el campo usado para login')

	console.log('\nTest 4.1: User existe - Alice');
	const aliceByUsername = await userRepo.findByUsername(alice.username);
	userExists(aliceByUsername);

	console.log('\nTest 4.2: User NO existe - undefined | null');
	const noExsistByUsername = await userRepo.findByUsername('Pepe');
	userExists(noExsistByUsername);
	
	console.log('Fin test findByUsername\n');

	// TEST 5 : UPDATE PASSWORD & AND TOGGLE ONLINE STATUS
	console.log('\nTest 5: updatePassword & setOnlineStatus');

	if (!aliceByEmail) process.exit(1);
	console.log('Password inicial: ', aliceByEmail.passwordHash);
	console.log('Online status inicial: ', aliceByEmail.isOnline);
	userRepo.updatePassword(aliceByEmail.id, `Timesamped_${Date.now()}`);
	console.log('Password cambiado');
	userRepo.setOnlineStatus(aliceByEmail.id, aliceByEmail.isOnline ? false : true);
	console.log('Status cambiado');
	const updateAlice = await userRepo.findByEmail('alice@test.com' as Email);
	console.log('Password actualizado: ', updateAlice?.passwordHash);
	console.log('Online status cambiado: ', updateAlice?.isOnline);

	// TEST 6 : VALIDATIONS
	console.log('\nTest 6: Validations');

	console.log(`isEmailTaken('alice@test.com): ${await userRepo.isEmailTaken('alice@test.com' as Email)}`);
	console.log(`isEmailTaken('pepe@test.com): ${await userRepo.isEmailTaken('pepe@test.com' as Email)}`);
	
	console.log(`isEmailTaken('alICE@test.com): ${await userRepo.isEmailTaken('alICE@test.com' as Email)}`);
	console.log(`isEmailTaken('pEpe@test.COM): ${await userRepo.isEmailTaken('pEpe@test.COM' as Email)}`);
	
	console.log(`isEmailUsername('Alice'): ${await userRepo.isUsernameTaken('Alice')}`);
	console.log(`isEmailUsername('Pepe'): ${await userRepo.isUsernameTaken('Pepe')}`);

	console.log(`isEmailUsername('ALICE'): ${await userRepo.isUsernameTaken('AliCE')}`);
	console.log(`isEmailUsername('pePE'): ${await userRepo.isUsernameTaken('pePE')}`);
	
	// TEST 7 : DELETE
		console.log('\nTest 7: Crear usuario para delete');

	let pepe: UserTypes.User | null = null;
	try { 	
		const createUserData: UserTypes.CreateUserData = {
			username: "Pepe",
			email: "pepe@test.com",
			passwordHash: `Timesamped_${Date.now()}`, // simulado ya hasheado
			avatar: 'https://image.com/myimage.png'	
		} as UserTypes.CreateUserData;	
		
		let pepe = await userRepo.create(createUserData);
		console.warn('Pepe se creó');
	} catch {
		console.warn('Pepe ya está en la base de datos y no se creó');
	} finally {
		if (!pepe) pepe = await userRepo.findByUsername('Pepe');
		console.log('Recuprado Pepe de la base de datos');
	}
	
	if (pepe) userExists(pepe);
	else process.exit(1);

	await userRepo.delete(pepe.id);
	console.log('Pepe borrado');
	const updatePepe = await userRepo.findByUsername('pepe');
	userExists(updatePepe);
}

testUserRepository();
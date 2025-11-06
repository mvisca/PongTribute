import { FastifyPluginAsync } from 'fastify';
import { UserSchemas } from '@transcendence/shared';
import { UserController } from '../controllers/user.controller';

/**
* Plugin de rutas de usuario\
* Registra todos los endpoints relacionados con User\
* \
* Endpoints:\
* - POST   /users                    → Crear usuario\
* - PUT    /users/:id                → Actualizar usuario\
* - PUT    /users/:id/password       → Cambiar password\
* - DELETE /users/:id                → Eliminar usuario\
* - GET    /users/:id                → Buscar por ID\
* - GET    /users/username/:username → Buscar por username\
* - GET    /users/email/:email       → Buscar por email (auth interno)\
* - GET    /users/check-username/:username → Verificar disponibilidad\
* - GET    /users/check-email/:email → Verificar disponibilidad
*/
export const userRoutes: FastifyPluginAsync = async (app) => {
	
	// instancia unica de controller para todas las rutas
	const controller = new UserController();
	
	/**
	* POST /users
	* Crear nuevo usuario
	* Body: { username, email, passwordHash, avatar? }
	* Response: 201 con User | 409 si duplicado
	*/
	app.post('/users', {
		schema: UserSchemas.createUserSchema,
		handler: controller.createUser.bind(controller)
	});
	
	/**
	* PUT /users/:id
	* Actualiza usuario
	* Body: { username?, email?, avatar? }
	* Param: { id: string }
	* Response: 200 con User | 404 si no existe |  409 si ya existe
	*/
	app.put('/users/:id', {
		schema: UserSchemas.updateUserSchema,
		handler: controller.updateUser.bind(controller)
	});
	
	/**
	* PUT /users/:id/password
	* Actualiza password del usuario
	* Param: { id: string }
	* Response: 204 sin contenido | 404 si no existe
	*/
	app.put('/users/:id/password', {
		schema: UserSchemas.updatePasswordSchema,
		handler: controller.updatePassword.bind(controller)
	});

	/**
	* ANONYNIZE /users/:id
	* Anonimiza usuario
	* Param: { id: string }
	* Response: 204 sin contenido | 404 si no existe
	*/
	app.put('/users/:id/anonymize', {
		schema: UserSchemas.anonymizeUserSchema,
		handler: controller.anonymizeUser.bind(controller)
	});
	
	/**
	* DELETE /users/:id
	* Borra usuario
	* Param: { id: string }
	* Response: 204 sin contenido | 404 si no existe
	*/
	app.delete('/users/:id', {
		schema: UserSchemas.deleteUserSchema,
		handler: controller.deleteUser.bind(controller)
	});
	
	app.get('/users/username/:username', {
		schema: UserSchemas.getUserByUsernameSchema,
		handler: controller.getUserByUsername.bind(controller)
	});
	
	app.get('/users/email/:email', {
		schema: UserSchemas.getUserByEmailSchema,
		handler: controller.getUserByEmail.bind(controller)
	});
	
	app.get('/users/check-username/:username', {
		schema: UserSchemas.checkUsernameSchema,
		handler: controller.checkUsername.bind(controller)
	});
	
	app.get('/users/check-email/:email', {
		schema: UserSchemas.checkEmailSchema,
		handler: controller.checkEmail.bind(controller)
	});
	
	app.get('/users/:id', {
		schema: UserSchemas.getUserByIdSchema,
		handler: controller.getUserById.bind(controller)
	});	
}
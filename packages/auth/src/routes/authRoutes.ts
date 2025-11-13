import { FastifyPluginAsync } from "fastify";
import { AuthController } from "../controllers/AuthController";

export const authRoutes: FastifyPluginAsync = async (app) => {
	const controller = new AuthController();

	app.post('/auth/login',
		{
			handler: controller.login.bind(controller)
		}
	);
}
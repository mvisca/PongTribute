import { internalRoutes as INR } from "./user.internalRoutes.js";
import { publicRoutes as PBR } from "./user.publicRoutes.js";
import { protectedRoutes as PTR} from "./user.protectedRoutes.js";

export namespace UserRoutes {
	export const internalRoutes = INR;
	export const publicRoutes = PBR;
	export const protectedRoutes = PTR; 
}
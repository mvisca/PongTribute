import { internalRoutes as INR } from "./user.internalRoutes";
import { publicRoutes as PBR } from "./user.publicRoutes";
import { protectedRoutes as PTR} from "./user.protectedRoutes";

export namespace UserRoutes {
	export const internalRoutes = INR;
	export const publicRoutes = PBR;
	export const protectedRoutes = PTR; 
}
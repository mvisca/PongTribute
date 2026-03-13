import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTypes } from '@transcendence/shared/types/auth.types.js';

type AuthState = { 
	user: AuthTypes.AccessTokenPayload | null;
	avatar: string | null;
	accessToken: string | null;
	isAuthenticated: boolean;
	isValidating: boolean;
	login: (user: AuthTypes.AccessTokenPayload, accessToken: string) => void;
	logout: () => void;
	setUser: (user: AuthTypes.AccessTokenPayload) => void;
	setAvatar: (avatar: string | null) => void;
	setAccessToken: (accessToken: string) => void;
	setValidating: (isValidating: boolean) => void;
};

// Inicialización del store Zustand
// Está disponible para todos los componentes 
// Pueden leerlo y escribirlo usando el hook useAuthStore()
export const useAuthStore = create<AuthState>()(
	// Middleware que intercepta cada set() del store
	// Sincroniza el estado con localstorage
	// Cuando la app recarga rehidrata el store con localstorage antes de que componentes renderice
	persist(
		(set) => ({
			user: null,
			avatar: null,
			accessToken: null,
			isAuthenticated: false,
			isValidating: false,
			
			login: (user, accessToken) => set({
				user,
				avatar: null,
				accessToken,
				isAuthenticated: true,
				isValidating: false,
			}),
			
			logout: () => set({
				user: null,
				avatar: null,
				accessToken: null,
				isAuthenticated: false,
				isValidating: false,
			}),
			
			setUser: (user) => set({ user }),

			setAvatar: (avatar) => set({ avatar }),

			setAccessToken: (accessToken) => set({ accessToken }),

			setValidating: (isValidating) => set({ isValidating }),
		}),
		{
			name: 'auth-storage',
			// Decide qué parte del estado se serializa
			partialize: (state) => ({
				user: state.user,
				avatar: state.avatar,
				accessToken: state.accessToken,
				isAuthenticated: state.isAuthenticated,
			}),
		}
	)
);
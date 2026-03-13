import { useEffect, useState } from 'react';
import { useAuthStore } from './AuthStore';
import { verifyToken } from '../../features/auth/api/authApi';

export function useAuthValidation() {
	const [isValidating, setIsValidating] = useState(true);
	const accessToken = useAuthStore(state => state.accessToken);
	const isAuthenticated = useAuthStore(state => state.isAuthenticated);
	const logout = useAuthStore(state => state.logout);

	useEffect(() => {
		async function validate() {
			if (!accessToken || !isAuthenticated) {
				setIsValidating(false);
				return;
			}

			const isValid = await verifyToken(accessToken);

			if (!isValid) {
				console.warn('[Auth] Token expired or invalid - logging out');
				logout();
			}

			setIsValidating(false);
		}

		validate();
	}, []); // Solo ejecutar al montar

	return { isValidating };
}

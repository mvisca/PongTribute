import { useEffect, useState } from 'react';
import { useAuthStore } from './AuthStore';
import { verifyToken } from '../../features/auth/api/authApi';

export function useAuthValidation() {
	const accessToken = useAuthStore(state => state.accessToken);
	const isAuthenticated = useAuthStore(state => state.isAuthenticated);
	const isValidating = useAuthStore(state => state.isValidating);
	const setValidating = useAuthStore(state => state.setValidating);
	const logout = useAuthStore(state => state.logout);

	useEffect(() => {
		async function validate() {
			// No need to validate if there's no token
			if (!accessToken || !isAuthenticated) {
				setValidating(false);
				return;
			}

			// Show loader while validating
			const isValid = await verifyToken(accessToken);

			if (!isValid) {
				console.warn('[Auth] Token expired or invalid - logging out');
				logout();
			}

			// Finish validation
			setValidating(false);
		}

		validate();
	}, []); // Only on mount, no dependencies so it dosn't reloads

	return { isValidating };
}

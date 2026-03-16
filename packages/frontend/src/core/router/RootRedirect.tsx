import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../auth/AuthStore';
import { LoadingScreen } from '../../shared/components/ui';

export function RootRedirect() {
	const isAuthenticated = useAuthStore(state => state.isAuthenticated);
	const isValidating = useAuthStore(state => state.isValidating);

	// Wait during validation
	if (isValidating) {
		return <LoadingScreen />;
	}

	// Redirects based on auth status
	return isAuthenticated
	? <Navigate to='/home' replace />
	: <Navigate to='/welcome' replace />
}
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../auth/AuthStore';
import { LoadingScreen } from '../../shared/components/ui';

type Props = {
	children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const isValidating = useAuthStore((state) => state.isValidating);

	// Waits while token is validated
	if (isValidating) {
		return <LoadingScreen />;
	}

	// When not authenticated
	if (!isAuthenticated) {
		return <Navigate to='/login' replace />
	}

	return <>{children}</>
} 
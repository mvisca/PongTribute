import { Navigate } from 'react-router-dom';
import { useAuthStore } from './AuthStore';

type Props = {
	children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	if (!isAuthenticated) {
		return <Navigate to='/login' replace />
	}

	return <>{children}</>
}
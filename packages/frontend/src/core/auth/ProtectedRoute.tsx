import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

type Props = {
	children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
	const isAuthenticated = useAuth((state) => state.isAuthenticated);

	if (!isAuthenticated) {
		return <Navigate to='/login' replace />
	}

	return <>{children}</>
}
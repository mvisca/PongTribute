import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import LoadingScreen from '../../../shared/components/ui/LoadingScreen';

export const OAuthCallbackPage = () => {
	const navigate = useNavigate();
	const { login } = useAuthStore();

	useEffect(() => {
		const processCallback = async () => {
			try {
				// Parse URL params
				const params = new URLSearchParams(window.location.search);
				const token = params.get('token');
				const error = params.get('error');

				// Handle error case
				if (error || !token) {
					console.error('OAuth callback error:', error);
					navigate('/login?error=oauth_failed', { replace: true });
					return;
				}

				// JWT uses base64url — replace url-safe chars before atob
				const base64url = token.split('.')[1];
				const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
				const payload = JSON.parse(atob(base64));

				login(payload, token);
				navigate('/home', { replace: true });

			} catch {
				navigate('/login?error=oauth_failed', { replace: true });
			}
		};

		processCallback();
	}, [login, navigate]);

	return <LoadingScreen />;
};
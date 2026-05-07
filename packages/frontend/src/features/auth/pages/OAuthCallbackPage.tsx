import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { LoadingScreen } from '../../../shared/components/ui/LoadingScreen';

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

				// Decode JWT payload (without verification)
				const payloadBase64 = token.split('.')[1];
				const payloadJson = atob(payloadBase64);
				const payload = JSON.parse(payloadJson);

				// Login with decoded payload
				await login(payload, token);

				// Redirect to home
				navigate('/home', { replace: true });

			} catch (err) {
				console.error('OAuth callback processing failed:', err);
				navigate('/login?error=oauth_failed', { replace: true });
			}
		};

		processCallback();
	}, [login, navigate]);

	return <LoadingScreen />;
};
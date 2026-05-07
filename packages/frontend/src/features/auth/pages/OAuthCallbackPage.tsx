import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { getProfile } from '../../profile/api/profileApi';
import LoadingScreen from '../../../shared/components/ui/LoadingScreen';

export const OAuthCallbackPage = () => {
	const navigate = useNavigate();
	const { login, setAvatar } = useAuthStore();

	useEffect(() => {
		const processCallback = async () => {
			try {
				const params = new URLSearchParams(window.location.search);
				const token = params.get('token');
				const error = params.get('error');

				if (error || !token) {
					navigate('/login?error=oauth_failed', { replace: true });
					return;
				}

				// JWT uses base64url — normalize before atob
				const base64url = token.split('.')[1];
				const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
				const payload = JSON.parse(atob(base64));

				login(payload, token);

				getProfile(payload.id, token)
					.then(profile => setAvatar(profile.avatar ?? null))
					.catch(() => null);

				navigate('/home', { replace: true });

			} catch {
				navigate('/login?error=oauth_failed', { replace: true });
			}
		};

		processCallback();
	}, [login, navigate, setAvatar]);

	return <LoadingScreen />;
};
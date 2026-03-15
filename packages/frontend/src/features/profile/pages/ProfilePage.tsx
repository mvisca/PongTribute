import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { getProfile } from '../api/profileApi';
import {
	PageContainer,
	FormCard,
	ArcadeButton,
	LoadingScreen,
	AvatarDisplay,
	AlertError,
} from '../../../shared/components/ui';

export default function ProfilePage() {
	const navigate = useNavigate();
	const userId = useAuthStore((state) => state.user?.id);
	const token = useAuthStore((state) => state.accessToken);

	const [profile, setProfile] = useState<UserTypes.UserPublic | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [twoFAEnabled, setTwoFAEnabled] = useState(false);

	useEffect(() => {
		if (!userId || !token) {
			setLoading(false);
			setError('No user session found');
			return;
		}

		const fetchProfile = async () => {
			try {
				const data = await getProfile(userId, token);
				console.log('[ProfilePage] data received:', data);
				setProfile(data);
				setTwoFAEnabled(data.has2FAEnabled ?? false);
			} catch(err) {
				setError('Failed to load profile');
				console.error('[ProfilePage] fetch error:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchProfile();
	}, [userId, token]);

	if (loading) return <LoadingScreen />;

	if (error || !profile) {
		return (
			<PageContainer>
				<AlertError message={error || 'Profile not found'} />
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="relative">
				
				{/* Botón cerrar */}
				<button
					onClick={() => navigate('/lobby')}
					className="absolute right-4 top-4 text-purple-300 hover:text-white text-xl"
				>
					✕
				</button>

				<FormCard title={profile.username}>
					<div className='flex justify-center mb-4'>
						<AvatarDisplay src={profile.avatar} size='lg' />
					</div>

					<p className='text-sm text-purple-300 text-center mb-1'>
						{profile.email}
					</p>

					<p className='text-xs text-center mb-6'>
						<span className={profile.isOnline ? 'text-green-400' : 'text-purple-500'}>
							{profile.isOnline ? '● Online' : '○ Offline'}
						</span>
					</p>

					<div className='flex flex-col gap-5 mt-6'>

						<ArcadeButton onClick={() => navigate('/profile/edit')}>
							EDIT PROFILE
						</ArcadeButton>

						<ArcadeButton onClick={() => navigate('/profile/password')}>
							CHANGE PASSWORD
						</ArcadeButton>

						<ArcadeButton onClick={() => navigate('/history')}>
							HISTORY
						</ArcadeButton>

						<ArcadeButton onClick={() => navigate('/friends')}>
							FRIENDS
						</ArcadeButton>
						
						{/* Toggle 2FA */}
						<button
  							onClick={() => setTwoFAEnabled(!twoFAEnabled)}
  							className={`px-6 py-2 rounded-lg text-white font-bold text-sm transition-colors ${
    						twoFAEnabled ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'
  							}`}
						>
  						{twoFAEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA'}
						</button>

					</div>
				</FormCard>
			</div>
		</PageContainer>
	);
}
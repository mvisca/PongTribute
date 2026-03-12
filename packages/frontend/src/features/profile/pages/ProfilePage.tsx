import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { getProfile } from '../api/profileApi';
import {
	PageContainer,
	FormCard,
	ArcadeButton,
	NeonButton,
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
			} catch(err) {
				setError('Failed to load profile');
				console.error('[ProfilePage] fetch error:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchProfile();
	}, [userId, token]);

	// Loading page
	if (loading) {
		return <LoadingScreen />;
	}

	// Error page
	if (error || !profile) {
		return (
			<PageContainer>
				<AlertError message={error || 'Profile not found'} />
			</PageContainer>
		);
	}

	// Profile view page
	return (
		<PageContainer>
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

				<div className='flex flex-col gap-3 mt-6'>
					<ArcadeButton onClick={() => navigate('/profile/edit')}>EDIT PROFILE</ArcadeButton>
					<NeonButton onClick={() => navigate('/profile/password')}>CHANGE PASSWORD</NeonButton>
					<NeonButton onClick={() => navigate('/home')}>HOME</NeonButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}

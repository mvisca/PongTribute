import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';
import { useAuth } from '../../../core/auth/AuthContext';
import { getProfile } from '../api/profileApi';

export default function ProfilePage() {
	const navigate = useNavigate();
	const userId = useAuth((state) => state.user?.id);
	const token = useAuth((state) => state.accessToken);

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
		
	// Pagina de carga
	if (loading) {
		return (
			<div className='retro-bg flex items-center justify-center min-h-screen'>
				<p className='text-purple-300'>Loading...</p>
			</div>
		);
	}

	// Pagina de error
	if (error || !profile) {
		return (
			<div className='retro-bg flex items-center justify-center min-h-screen'>
				<p className='alert-error'>{error || 'Profile not found'}</p>
			</div>
		);
	}

	// Pagina de visualización de perfil
	return (
		<div className='retro-bg flex items-center justify-center min-h-screen'>
			<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg'>

				<div className='flex justify-center mb-4'>
					<img 
						src={profile.avatar}
						alt='Avatar'
						className='avatar-preview'
					/>
				</div>

				<h1 className='text-2xl font-bold text-center mb-2'>
					{profile.username}
				</h1>
				<p className='text-sm text-purple-300 text-center mb-1'>
					{profile.email}
				</p>
				<p className='text-xs text-center mb-6'>
					<span className={profile.isOnline ? 'text-green-400' : 'text-purple-500'}>
						{profile.isOnline ? '● Online' : '○ Offline'}
					</span>
				</p>

				<div className='flex justify-center gap-4'>
					<button 
						className='arcade-btn px-6 py-2 text-sm'
						onClick={() => navigate('/profile/edit')}
					>
						EDIT PROFILE
					</button>
					<button
						className='neon-btn px-6 py-2 text-sm'
						onClick={() => navigate('/home')}
					>
						HOME
					</button>
				</div>

			</div>
		</div>
	);
}
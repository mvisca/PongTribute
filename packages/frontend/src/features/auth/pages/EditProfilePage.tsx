import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { updateProfile, getProfile } from '../../profile/api/profileApi';
import { useAuthStore } from '../../../core/auth/AuthStore';
import {
	PageContainer,
	FormCard,
	FormInput,
	ArcadeButton,
	LinkButton,
	AlertError,
	AvatarUploader,
	LoadingScreen,
} from '../../../shared/components/ui';

type ErrorsState = {
	username: string,
	email: string,
};

export default function EditProfilePage() {
	const navigate = useNavigate();

	const token		= useAuthStore((state) => state.accessToken);
	const currentUser = useAuthStore((state) => state.user);
	const userId	= useAuthStore((state) => state.user?.id);
	const username	= useAuthStore((state) => state.user?.username);
	const email		= useAuthStore((state) => state.user?.email);

	const setUser	= useAuthStore((state) => state.setUser);
	const setAvatar = useAuthStore((state) => state.setAvatar);
	const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
	const [usernameInput, setUsername] = useState(username ?? '');
	const [emailInput, setEmail] = useState(email ?? '');
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
	const [avatarRemoved, setAvatarRemoved] = useState(false);
	const [loading, setLoading] = useState(false);

	const [errors, setErrors] = useState<ErrorsState>({ username: '', email: ''	});
	const [error, setError] = useState('');

	// Load avatar
	useEffect(() => {
		if (!userId || !token) return;
		getProfile(userId, token)
			.then(profile => setCurrentAvatar(profile.avatar))
			.catch(() => {});
	}, []);

	// Valida inputs
	const validateInputs = () => {
		setError('');

		const usernameError = validate(usernameInput!, Validators.username)
			? ''
			: Validators.username.message;

		const emailError = validate(emailInput!, Validators.email)
			? ''
			: Validators.email.message;

		setErrors({ username: usernameError, email: emailError });

		return !usernameError && !emailError;
	};

	const clearErrors = () => {
		setErrors({ username: '', email: ''});
		setError('');
	}

	// Handles data submission
	const handleSubmit = async () => {
		if (!validateInputs()) return;

		setLoading(true);
		setError('');

		try {
			const updatedProfile = await updateProfile(userId!, {
				username: usernameInput,
				email: emailInput,
				avatar: avatarBase64 ?? (avatarRemoved ? null : undefined),
			}, token!);

			setUser({
				...currentUser!,
				username: usernameInput,
				email: emailInput
			});

			setAvatar(updatedProfile.avatar ?? null);

			navigate('/profile');

		} catch(err: any) {
			setError(err?.message ?? 'Update failed');
			setLoading(false);
		}
	};

	if (loading) {
		return <LoadingScreen />;
	}

	return (
		<PageContainer>
			<FormCard title='EDIT PROFILE'>
				<AlertError message={error} />

				<AvatarUploader
					currentSrc={currentAvatar}
					onFileChange={(b64) => { setAvatarBase64(b64); setAvatarRemoved(b64 === null); }}
					onError={(msg) => setError(msg)}
				/>

				<div className='mt-6'>
					<FormInput
						value={usernameInput}
						onChange={(v) => { setUsername(v); clearErrors(); }}
						placeholder='Username'
						error={errors.username}
					/>
				</div>
				<div className='-mt-3'>
					<FormInput
						value={emailInput}
						onChange={(v) => { setEmail(v); clearErrors(); }}
						placeholder='Email'
						error={errors.email}
					/>
				</div>
				<div className='flex justify-center mt-6'>
					<ArcadeButton
						onClick={handleSubmit}
						disabled={loading || !!error || Object.values(errors).some(err => err !== '')}
					>
						UPDATE PROFILE
					</ArcadeButton>
				</div>

				<div className='mt-6 text-right'>
					<LinkButton onClick={() => navigate('/profile')}>← Back to profile</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}

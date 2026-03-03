import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { updateProfile, getProfile } from '../../profile/api/profileApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
	PageContainer,
	FormCard,
	FormInput,
	ArcadeButton,
	LinkButton,
	AlertError,
	AvatarUploader,
} from '../../../shared/components/ui';

type ErrorsState = {
	username: string,
	email: string,
};

export default function EditProfilePage() {
	const navigate = useNavigate();

	const userId	= useAuth((state) => state.user?.id);
	const token		= useAuth((state) => state.accessToken);
	const username	= useAuth((state) => state.user?.username);
	const email		= useAuth((state) => state.user?.email);
	const currentUser = useAuth((state) => state.user);
	const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
	const setUser	= useAuth((state) => state.setUser);

	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
	const [usernameInput, setUsername] = useState(username ?? '');
	const [emailInput, setEmail] = useState(email ?? '');
	const [errors, setErrors] = useState<ErrorsState>({
		username: '',
		email: '',
	});
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

		const isValid = !usernameError && !emailError;

		if (!isValid) {
			setError('Invalid field in form');
		}

		return isValid;
	};

	// Maneja el envío de datos
	const handleSubmit = async () => {
		if (!validateInputs()) return;

		try {
			await updateProfile(userId!, {
				username: usernameInput,
				email: emailInput,
				...(avatarBase64 && { avatar: avatarBase64 }),
			}, token!);

			setUser({
				...currentUser!,
				username: usernameInput,
				email: emailInput
			});

			navigate('/profile');

		} catch(err: any) {
			setError(err?.message ?? 'Update failed');
		}
	};

	return (
		<PageContainer>
			<FormCard title='EDIT PROFILE'>
				<AlertError message={error} />

				<AvatarUploader
					currentSrc={currentAvatar}
					onFileChange={(b64) => setAvatarBase64(b64)}
				/>

				<FormInput
					value={usernameInput}
					onChange={(v) => { setUsername(v); setErrors({...errors, username: ''}); }}
					placeholder='Username'
					error={errors.username}
				/>

				<FormInput
					value={emailInput}
					onChange={(v) => { setEmail(v); setErrors({...errors, email: ''}); }}
					placeholder='Email'
					error={errors.email}
				/>

				<div className='flex justify-center mt-6'>
					<ArcadeButton
						onClick={handleSubmit}
						disabled={!!error || Object.values(errors).some(err => err !== '')}
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

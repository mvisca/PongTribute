import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { useAuth } from '../../../core/auth/AuthContext';
import { updateProfile } from '../../profile/api/profileApi';
import { useAvatarUpload } from '../../../shared/hooks/useAvatarUpload';

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
	const setUser	= useAuth((state) => state.setUser);

	const { preview, base64, error: avatarError, handleFile} = useAvatarUpload();
	
	const [usernameInput, setUsername] = useState(username ?? '');
	const [emailInput, setEmail] = useState(email ?? '');
	const [errors, setErrors] = useState<ErrorsState>({
		username: '',
		email: '',
	});
	const [error, setError] = useState('');
	
	
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
	
	const handleSubmit = async () => {
		if (!validateInputs()) {
			return;
		}
		
		try {
			await updateProfile(userId!, { 
				username: usernameInput,
				email: emailInput,
				...(base64 && { avatar: base64 }),
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
		<div
			className='retro-bg flex items-center justify-center min-h-screen'>
			<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg'>
				<h1 className='text-2xl font-bold text-center mb-4'>
					EDIT PROFILE
				</h1>
		
				{error && <p className='alert-error'>{error}</p>}
		
				<div className='mb-4'>
					{preview
						? <img src={preview} className='avatar-preview' alt='Avatar preview' />
						: <div className='avatar-placeholder'>👤</div>
					}
					<input 
						type='file'
						className='block text-sm text-purpule-300 mt-2'
						accept='image/png,image/jpeg,image/jpg,image/webp'
						onChange={(e) => handleFile(e.target.files?.[0])}
					/>
					{avatarError && <p className='alert-error'>{avatarError}</p>}
				</div>
		
				<div className="mb-4">
					<input
						className="input"
						placeholder="Username"
						value={usernameInput}
						onChange={(e) => { setUsername(e.target.value); setErrors({...errors, username: ''}); }}
						onBlur={validateInputs}
					/>
					{errors.username && <p className="alert-error">{errors.username}</p>}
				</div>
		
				<div className='mb-4'>
					<input
						className='input'
						placeholder='Email'
						value={emailInput}
						onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: ''}); }}
						onBlur={validateInputs}
					/>
					{errors.email && <p className='alert-error'>{errors.email}</p>}
				</div>
		
				<div className="flex justify-center mt-6">
					<button
						onClick={handleSubmit}
						className="arcade-btn px-8 py-2 text-sm"
						disabled={!!error || Object.values(errors).some(err => err !== '')}
					>
						UPDATE PROFILE
					</button>
				</div>
		
				<div className="mt-6 text-right text-sm text-purple-300">
					<button 
						onClick={() => navigate('/profile')}
						className="hover:underline"
					>
						← Back to profile
					</button>
				</div>
			</div>
		</div>
	);
}
// TODO que hacer con la estrategia de componentes y sections... implmentar urgente, antes de avanzar mucho más
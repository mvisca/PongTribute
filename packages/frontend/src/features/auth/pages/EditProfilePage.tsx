import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared';
import { useAuth } from '../../../core/auth/AuthContext';
import { updateProfile } from '../api/profileApi';

type ErrorsState = {
	username: string,
	email: string,
	avatar: string,
};

export default function EditProfilePage() {
	const navigate = useNavigate();
	const { userId, token } = useAuth((state) => ({ userId: state.user?.id, token: state.accessToken }));
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [avatar, setAvatar] = useState('');
	const [errors, setErrors] = useState<ErrorsState>({
		username: '',
		email: '',
		avatar: '',
	});
	const [error, setError] = useState('');
	
	const validateInputs = () => {
		setError('');

		const usernameError = validate(username, Validators.username)
		? ''
		: Validators.username.message;
		
		const emailError = validate(email, Validators.email)
		? ''
		: Validators.email.message;
		
		const avatarError = validate(avatar, Validators.avatarBase64)
		? ''
		: Validators.avatarBase64.message;
		
		setErrors({ username: usernameError, email: emailError, avatar: avatarError });
		
		const isValid = !usernameError && !emailError && !avatarError;

		if (!isValid) {
			setError('Invalid fiel in form');
		}

		return isValid;
	};	
	
	const handleSubmit = async () => {
		if (!validateInputs()) {
			return;
		}
		
		try {
			await updateProfile(userId!, { username, email, avatar }, token!);
			navigate('/profile');
		} catch(err: any) {
			console.error('Error updating profile:', err);
		} 
	};

	return (
		<div
			className='retro-bg flex items-center justify-center'>
				<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg'>
					<h1 className='text-2xl font-bold text-center mb-4'>
						EDIT PROFILE
					</h1>

					<div className='mb-4'>
						<input 
							className='input'
							placeholder='Username'
							value={username}
							onChange={(e) => {setUsername(e.target.value); setErrors({...errors, username: ''}); }}
							onBlur={validateInputs}
						/>
						{errors.username && <p className='alert-error'>{errors.username}</p>}

					<div className="mb-4">
						<input
							className="input"
							placeholder="Email"
							value={email}
							onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: ''}); }}
							onBlur={validateInputs}
						/>
						{errors.email && <p className="alert-error">{errors.email}</p>}
					</div>

					<div className="mb-4">
						<input
							className="input"
							placeholder="Avatar URL"
							value={avatar}
							onChange={(e) => { setAvatar(e.target.value); setErrors({...errors, avatar: ''}); }}
							onBlur={validateInputs}
						/>
						{errors.avatar && <p className="alert-error">{errors.avatar}</p>}
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
					{error && <p className="alert-error">{error} </p> }


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
		</div>
	);
}
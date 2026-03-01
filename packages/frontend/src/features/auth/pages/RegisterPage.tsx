import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { register } from '../api/authApi';
import { useAuth } from '../../../core/auth/AuthContext';
import { useAvatarUpload } from '../../../shared/hooks/useAvatarUpload';

type ErrorsState = {
	username: string,
	email: string,
	password: string
}

export default function RegisterPage() {
	const navigate = useNavigate();
	const authLogin = useAuth((state) => state.login);
	const { preview, base64, error: avatarError, handleFile, clear: clearAvatar } = useAvatarUpload();
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<ErrorsState>({
		username: '',
		email: '',
		password: ''
	});
	const [error, setError] = useState('');

	const validateInputs = () => {
		const usernameError = validate(username, Validators.username)
		? ''
		: Validators.username.message;

		const emailError = validate(email, Validators.email)
		? ''
		: Validators.email.message;

		const passwordError = validate(password, Validators.password)
		? ''
		: Validators.password.message;
		
		setErrors({ username: usernameError, email: emailError, password: passwordError });

		const isValid = !usernameError && !emailError && !passwordError;

		if (!isValid) {
			setError('Invalid data in the registration form');
		}

		return isValid;
	};

	async function handleRegister() {
		setError('');

		// Validar inputs antes de enviar
		if (!validateInputs()) {
			return;
		}

		try {
			const data = await register(username, email, password, base64 ?? undefined);
			authLogin(data.user, data.token);
			navigate('/profile');
		} catch (err: any) {
			setError(err?.message ?? 'Register failed');
		}
	}

	return (
		<div className="retro-bg flex items-center justify-center">
			<div className="bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg">
				<h1 className="text-2xl font-bold text-center mb-4">
					Create Account
				</h1>

				{error && (
					<div className="mb-4 p-2 bg-purple-900 text-purple-200 text-sm text-center rounded">
						{error}
					</div>
				)}
				
				<input
					className="input"
					placeholder="Username"
					value={username}
					onChange={(e) => { setUsername(e.target.value); setErrors({...errors, username: ''}); }}
					onBlur={validateInputs}
				/>
				{errors.username && <p className="alert-error">{errors.username}</p>}

				<input
					className="input"
					placeholder="Email"
					value={email}
					onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: ''}); }}
					onBlur={validateInputs}
				/>
				{errors.email && <p className="alert-error">{errors.email}</p>}

				<div className='mb-4'>
					{preview
						? <img src={preview} className='avatar-preview' alt='Avatar preview' />
						: <div className='avatar-placeholder'>👤</div>
					}
					<input
						type='file'
						accept='image/png,image/jpeg,image/jpg,image/webp'
						onChange={(e) => handleFile(e.target.files?.[0])}
						className='block text-sm text-purpule-300 mt-2'
					/>
					{avatarError && <p className='alert-error'>{avatarError}</p>}
				</div>

				<input
					type="password"
					className="input"
					placeholder="Password"
					value={password}
					onChange={(e) => { setPassword(e.target.value); setErrors({...errors, password: ''}); }}
					onBlur={validateInputs}
				/>
				{errors.password && <p className="alert-error">{errors.password}</p>}

				<div className="flex justify-center mt-6">
					<button
						onClick={handleRegister}
						className="arcade-btn px-8 py-2 text-sm"
						disabled={!!error || Object.values(errors).some(err => err !== '')}
					>
						REGISTER
					</button>
				</div>
				{error && <p className="alert-error">{error} </p> }

				<div className="mt-6 text-right text-sm text-purple-300">
					<button onClick={() => navigate('/login')} className="hover:underline">
						← Back to login
					</button>
				</div>
			</div>
		</div>
	);
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { register } from '../api/authApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
	PageContainer,
	FormCard,
	FormInput,
	PasswordInput,
	ArcadeButton,
	LinkButton,
	AlertError,
	AvatarUploader,
} from '../../../shared/components/ui';

type ErrorsState = {
	username: string,
	email: string,
	password: string
}

export default function RegisterPage() {
	const navigate = useNavigate();
	const authLogin = useAuth((state) => state.login);
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
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

		return !usernameError && !emailError && !passwordError;
	};

	const clearErrors = () => {
		setErrors({ username: '', email: '', password: ''});
		setError('');
	}

	async function handleRegister() {
		setError('');

		// Validar inputs antes de enviar
		if (!validateInputs()) return;

		try {
			const data = await register(username, email, password, avatarBase64 ?? undefined);
			authLogin(data.user, data.token);
			navigate('/profile');

		} catch (err: any) {
			setError(err?.message ?? 'Register failed');
		}
	}

	return (
		<PageContainer>
			<FormCard title='REGISTER'>
				<AlertError message={error} />

				<FormInput
					value={username}
					onChange={(value) => { setUsername(value); clearErrors();}}
					placeholder='Username'
					error={errors.username}
				/>

				<FormInput
					value={email}
					onChange={(value) => { setEmail(value); clearErrors();}}
					placeholder='Email'
					error={errors.email}
				/>

				<AvatarUploader currentSrc={null} onFileChange={setAvatarBase64} />

				<PasswordInput
					value={password}
					onChange={(value) => { setPassword(value); clearErrors();}}
					placeholder='Password'
					error={errors.password}
				/>

				<div className='flex justify-center mt-6'>
					<ArcadeButton
						onClick={handleRegister}
						disabled={!!error || Object.values(errors).some(err => err !== '')}
					>
						REGISTER
					</ArcadeButton>
				</div>

				<div className='mt-6 text-right'>
					<LinkButton onClick={() => navigate('/login')}>← Back to login</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { login } from '../api/authApi';
import { useAuth } from '../../../core/auth/AuthContext';
import { PageContainer, FormCard, FormInput, PasswordInput, ArcadeButton, LinkButton, AlertError } from '../../../shared/components/ui';
import { getProfile } from '../../profile/api/profileApi';

export default function LoginPage() {
	const navigate = useNavigate();
	const authLogin = useAuth((state) => state.login);
	const setAvatar = useAuth((state) => state.setAvatar);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');

	async function handleLogin() {
		setError('');

		if (!email || !password) {
			setError('Email and password are required');
			return;
		}

		if (!validate(email, Validators.email)) {
			setError(Validators.email.message);
			return;
		}

		if (!validate(password, Validators.password)) {
			setError(Validators.password.message);
			return;
		}

		try{
			const data = await login(email, password);
			if ('twoFactorRequired' in data) {
				navigate('/verify-2fa', { state: { provisionalToken: data.provisionalToken } });
				return;
			}

			console.log('[Login] data.user:', JSON.stringify(data.user));
			console.log('[Login] data.token:', data.token?.substring(0, 30));

			authLogin(data.user, data.token);
			
			// Fetch de avatar, no crítico, si falla será silencioso
			await getProfile(data.user.id, data.token)
				.then(profile => setAvatar(profile.avatar ?? null))
				.catch(() => {});

			navigate('/profile');
		} catch(err: any) {
			setError(err?.message ?? 'Login failed');
		}
	}

	return (
		<PageContainer>
			<div className='flex flex-col items-center'>
				{/* <h1 className='retro-title mb-10'>
					WELCOME TO <br /> PING🏓PONG
				</h1> */}

				<FormCard title='LOGIN'>
					<AlertError message={error} />
					<FormInput value={email} onChange={(v) => { setEmail(v); setError(''); }} placeholder='Email' error={''} />
					<PasswordInput value={password} onChange={(v) => { setPassword(v); setError(''); }} placeholder='Password' />

					<div className='flex justify-center mt-4'>
						<ArcadeButton onClick={handleLogin}>LOGIN</ArcadeButton>
					</div>

					<div className='mt-4 flex justify-between text-sm text-purple-300'>
						<LinkButton onClick={() => navigate('/register')}>Create account</LinkButton>
						<LinkButton onClick={() => navigate('/forgot')}>Forgot password?</LinkButton>
					</div>
				</FormCard>
			</div>
		</PageContainer>
	);
}

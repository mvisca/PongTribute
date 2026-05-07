import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { login } from '../api/authApi';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { PageContainer, FormCard, FormInput, PasswordInput, ArcadeButton, LinkButton, AlertError, LoadingScreen } from '../../../shared/components/ui';
import { getProfile } from '../../profile/api/profileApi';

export default function LoginPage() {
	const navigate = useNavigate();
	const authLogin = useAuthStore((state) => state.login);
	const setAvatar = useAuthStore((state) => state.setAvatar);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

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
		
		setLoading(true);
		
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

			//navigate('/profile');
			navigate("/home")
		} catch (err: any) {
			setLoading(false);
			setError(err?.message ?? 'Login failed');
		}
	}

	if (loading) return <LoadingScreen />;

	return (
		<PageContainer>
			<div className='flex flex-col items-center'>
				{/* <h1 className='retro-title mb-10'>
					WELCOME TO <br /> PING🏓PONG
				</h1> */}

				<FormCard title='LOGIN'>
					<AlertError message={error} />
					<FormInput value={email} onChange={(v) => { setEmail(v); setError(''); }} placeholder='Email' error={''} />
					<div className='-mt-2'>
						<PasswordInput value={password} onChange={(v) => { setPassword(v); setError(''); }} placeholder='Password' />
					</div>
					<div className='flex justify-center mt-4'>
						<ArcadeButton onClick={handleLogin}>LOGIN</ArcadeButton>
					</div>

					<div className='mt-4 flex justify-between text-sm text-purple-300'>
						<LinkButton onClick={() => navigate('/register')}>Create account</LinkButton>
						<LinkButton onClick={() => navigate('/forgot')}>Forgot password?</LinkButton>
					</div>

					{/* OAuth Divider */}
					<div className='relative my-6'>
						<div className='absolute inset-0 flex items-center'>
							<span className='w-full border-t border-purple-800'></span>
						</div>
						<div className='relative flex justify-center text-sm'>
							<span className='px-2 bg-black text-purple-400'>or continue with</span>
						</div>
					</div>

					{/* OAuth Buttons */}
					<div className='flex flex-col gap-3'>
						<a href='/api/auth/oauth/42/authorize' className='w-full'>
							<ArcadeButton className='w-full'>Sign in with 42</ArcadeButton>
						</a>
						<a href='/api/auth/oauth/google/authorize' className='w-full'>
							<ArcadeButton className='w-full'>Sign in with Google</ArcadeButton>
						</a>
						<a href='/api/auth/oauth/github/authorize' className='w-full'>
							<ArcadeButton className='w-full'>Sign in with GitHub</ArcadeButton>
						</a>
					</div>
				</FormCard>
			</div>
		</PageContainer>
	);
}

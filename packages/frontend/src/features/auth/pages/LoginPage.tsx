import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { login } from '../api/authApi';
import { useAuth } from '../../../core/auth/AuthContext';

export default function LoginPage() {
	const navigate = useNavigate();
	const authLogin = useAuth((state) => state.login);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');

	async function handleLogin() {
		setError('');

		console.log('start.login');
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

		console.log('validations.login.ok');
		try{
			
			console.log('inside.try.block');

			const data = await login(email, password);
			if ('twoFactorRequired' in data) {
				navigate('/verify-2fa', { state: { provisionalToken: data.provisionalToken } });
				return;
			}

			console.log('[Login] data.user:', JSON.stringify(data.user));
			console.log('[Login] data.token:', data.token?.substring(0, 30));

			authLogin(data.user, data.token);
			navigate('/profile');
		} catch(err: any) {
			setError(err?.message ?? 'Login failed');
		}
	}

	return (
		<div className='retro-bg flex flex-col items-center justify-center min-h-screen'>
			<h1 className='retro-title mb-10'>
				WELCOME TO <br />PING-PONG
			</h1>

			<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg'>
				{error && (
					<div className='mb-4 p-2 rounded bg-purple-900 text-purple-200 text-sm text-center'>
						{error}
					</div>
				)}

				<input
					className='input'
					placeholder='Email'
					value={email}
					onChange={ (e) => {setEmail(e.target.value); setError(''); }}
				/>

				<input
					type='password'
					className='input'
					placeholder='Password'
					value={password}
					onChange={ (e) => {setPassword(e.target.value); setError(''); }}
				/>

				<button onClick={handleLogin} className='arcade-btn w-full mt-4'>
					LOGIN
				</button>

				<div className="mt-4 flex justify-between text-sm text-purple-300">
					<button onClick={() => navigate('/register')} className="hover:underline">
						Create account
					</button>
					<button onClick={() => navigate('/forgot')} className="hover:underline">
						Forgot password?
					</button>
				</div>				
			</div>
		</div>
	);
}
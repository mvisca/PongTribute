import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { AuthTypes } from '@transcendence/shared';
import { useAuth } from '../../../core/auth/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function LoginPage() {
	const navigate = useNavigate();
	const authLogin = useAuth((state) => state.login);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');

	async function handleLogin() {
		setError('');

		if (!email || !password) {
			setError('Email and password are required');
			return;
		}

		if (!emailRegex.test(email)) {
			setError('Invalid email format');
			return;
		}

		if (!passwordRegex.test(password)) {
			setError('Invalid password format');
			return;
		}

		try{
			const data = await login(email, password);
			if ('twoFactorRequired' in data) {
				navigate('/verify-2fa', { state: { provisionalToken: data.provisionalToken } });
				return;
			}

			authLogin(data.user, data.token);
			navigate('/home');
		} catch(err: any) {
			setError(err?.message ?? 'Login failed');
		}
	}

	return (
		<div className='retro-bg flex flex-col items-center justify-center'>
			<h1 className='"retro-title mb-10'>
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
					onChange={ (e) => { setEmail(e.target.value); setError(''); } }
				/>

				<input
					type='password'
					className='input'
					placeholder='Password'
					value={password}
					onChange={(e) => { setPassword(e.target.value); setError(''); } }
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
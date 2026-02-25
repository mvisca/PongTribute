import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api/authApi';
import { useAuth } from '../../../core/auth/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function RegisterPage() {
	const navigate = useNavigate();
	const authLogin = useAuth((state) => state.login);

	const [username, setUsername] = useState('');
	const [email, setEmail]       = useState('');
	const [password, setPassword] = useState('');
	const [error, setError]       = useState('');

	async function handleRegister() {
		setError('');

		if (!username || !email || !password) {
			setError('All fields are required');
			return;
		}
		if (!emailRegex.test(email)) {
			setError('Invalid email format');
			return;
		}
		if (!passwordRegex.test(password)) {
			setError('Password must be at least 8 characters and include uppercase, lowercase and numbers');
			return;
		}

		try {
			const data = await register(username, email, password);
			authLogin(data.user, data.token);
			navigate('/home');
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
					onChange={(e) => { setUsername(e.target.value); setError(''); }}
				/>

				<input
					className="input"
					placeholder="Email"
					value={email}
					onChange={(e) => { setEmail(e.target.value); setError(''); }}
				/>

				<input
					type="password"
					className="input"
					placeholder="Password"
					value={password}
					onChange={(e) => { setPassword(e.target.value); setError(''); }}
				/>

				<div className="flex justify-center mt-6">
					<button onClick={handleRegister} className="arcade-btn px-8 py-2 text-sm">
						REGISTER
					</button>
				</div>

				<div className="mt-6 text-right text-sm text-purple-300">
					<button onClick={() => navigate('/login')} className="hover:underline">
						← Back to login
					</button>
				</div>
			</div>
		</div>
	);
}
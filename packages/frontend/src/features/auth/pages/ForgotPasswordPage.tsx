import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared';
import { requestPasswordReset } from '../api/authApi';

export default function ForgotPasswordPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');

	async function handleReset() {
		setError('');
		setMessage('');

		if (!email) {
			setError('Email is required');
			return;
		}

		if (!validate(email, Validators.email)) {
			setError(Validators.email.message);
			return;
		}

		try {
			await requestPasswordReset(email);
			setMessage('If that email exists, a recovery link has been sent.');
		} catch {
			setMessage('If that email exists, a recovery link has been sent.');
		}
	}

	return (
		<div className="retro-bg flex items-center justify-center">
			<div className="bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg">
				<h1 className="text-2xl font-bold text-center mb-4">
					Forgot Password
				</h1>

				{message && (
					<div className="mb-4 p-2 bg-green-800 text-green-100 text-sm text-center rounded">
						{message}
					</div>
				)}

				{error && (
					<div className="mb-4 p-2 bg-purple-900 text-purple-200 text-sm text-center rounded">
						{error}
					</div>
				)}

				<input
					className="input"
					placeholder="Email"
					value={email}
					onChange={(e) => { setEmail(e.target.value); setError(''); }}
				/>

				<div className="flex justify-center mt-6">
					<button onClick={handleReset} className="arcade-btn px-8 py-2 text-sm">
						SEND RECOVERY EMAIL
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
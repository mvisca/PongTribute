import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared';
import { confirmPasswordReset } from '../api/authApi';

export default function RecoverPasswordPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token');

	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	// Sin el token el link es inválido
	if (!token) {
		return (
			<div className='retro-bg flex items-center justify-center'>
				<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
					<p className='text-purple-200 mb-4'>Invalid or expired recovery link.</p>
					<button onClick={() => navigate('/forgot') } className='arcade-btn px-6 py-2 text-sm'>
						REQUEST NEW LINK
					</button>
				</div>
			</div>
		);
	}

	async function handleConfirm() {
		setError('');

		if (!password || !confirm) {
			setError('Both fields are required');
			return;
		}

		if (!validate(password, Validators.password)) {
			setError(Validators.password.message);
			return;
		}

		if (password !== confirm) {
			setError('Passwords do not match');
			return;
		}

		try {
			await confirmPasswordReset(token!, password);
			setSuccess(true);
			setTimeout(() => navigate('/login'), 2000);
		} catch (err: any) {
			setError(err?.message ?? 'Reset failed. Link may have expired.');
		}
	}

	if (success) {
		return (
			<div className='retro-bg flex items-center justify-center'>
				<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
					<p className='text-green-300 mb-2'>Password update successfully.</p>
					<p className='text-purple-300 text-sm'>Redirecting to login...</p>
				</div>
			</div>
		);
	}

	// Recover failed
	return (
		<div className='retro-bg flex items-center justify-center'>
			<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg'>
				<h1 className='text-2xl font-bold text-center mb-4'>
					New Password
				</h1>

				{error && (
					<div className='mb-4 p-2 bg-purple-900 text-purple-200 text-sm text-center rounded'>
						{error}
					</div>
				)}

				<input
					type="password"
					className='input'
					placeholder='New password'
					value={password}
					onChange={(e) => { setPassword(e.target.value); setError(''); }}
				/>

				<input
					type="password"
					className='input'
					placeholder='Confirm password'
					value={confirm}
					onChange={(e) => { setConfirm(e.target.value); setError(''); }}
				/>

				<div className='flex justify-center mt-6'>
					<button onClick={handleConfirm} className='arcade-btn px-8 py-2 text-sm'>
						SET PASSWORD
					</button>
				</div>

				<div className='mt-6 text-right text-sm text-purple-300'>
					<button onClick={() => navigate('/login')} className='hover:underline'>
						← Back to login
					</button>
				</div>
			</div>
		</div>
	);
}
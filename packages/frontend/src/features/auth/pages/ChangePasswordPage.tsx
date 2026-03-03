import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { apiRequest } from '../../../core/api/client';
import type { AuthTypes } from '@transcendence/shared/types/auth.types.js';

export default function ChangePasswordPage() {
	const navigate = useNavigate();

	const userId = useAuth((state) => state.user?.id);
	const token = useAuth((state) => state.accessToken);
	const currentUser = useAuth((state) => state.user);
	const setUser = useAuth((state) => state.setUser);
	const setAccessToken = useAuth((state) => state.setAccessToken);

	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPasseord, setConfirm] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	const handleSubmit = async () => {
		setError('');

		if (!newPassword || !oldPassword) {
			setError('All fields are required');
			return;
		}

		if (newPassword !== confirmPasseord) {
			setError('Passwords do not match');
			return;
		}

		if (newPassword.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		try {
			const data = await apiRequest<AuthTypes.LoginSuccessResponse>(
				`/auth/${userId}/password`,
				{ method: 'PUT', body: { oldPassword, newPassword }, token: token! }
			);
			// Backend rota los tokens, actualizar tokens
			setUser({ ...currentUser!, ...data.user });
			setAccessToken(data.token);
			setSuccess(true);
			setTimeout(() => navigate('/profle'), 1500);
		} catch (err: any) {
			setError(err?.message ?? 'Failed to change password');
		}
	};

	if (success) {
		return (
			<div className='retro-bg flex items-center justify-center min-h-screen'>
				<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
					<p className='text-green-300 mb-2'>Password updated successfully.</p>
					<p className='text-purple-300 text-sm'>Redirecting...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='retro-bg flex items-center jusify-center min-h-screen'>
			<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
				<h1 className='text-2xl font-bold text-center mb-6'>CHANGE PASSWORD</h1>

				{error && <p className='alert-error'>{error}</p>}

				<div className='mb-4'>
					<input 
						type='password'
						className='input'
						placeholder='Current password'
						value={oldPassword}
						onChange={(e) => { setOldPassword(e.target.value); setError('');}}
					/>
				</div>

				<div className='mb-4'>
					<input
						type='password'
						className='input'
						placeholder='New password'
						value={newPassword}
						onChange={(e) => { setNewPassword(e.target.value); setError('');}}
					/>
				</div>

				<div>
					<input
						type='password'
						className='input'
						placeholder='COnfirm new password'
						value={confirmPasseord}
						onChange={(e) => { setConfirm(e.target.value); setError('');}}
					/>
				</div>

				<div className='flex justify-center mt-6'>
					<button
						onClick={handleSubmit}
						className='arcade-btn px-8 py-2 text-sm'
						disabled={!!error}
					>
						UPDATE PASSWORD
					</button>
				</div>
			</div>
		</div>
	);
}
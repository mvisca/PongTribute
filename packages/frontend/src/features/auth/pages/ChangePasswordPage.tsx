import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { apiRequest } from '../../../core/api/client';
import type { AuthTypes } from '@transcendence/shared/types/auth.types.js';
import {
	PageContainer,
	FormCard,
	PasswordInput,
	ArcadeButton,
	LinkButton,
	AlertError,
} from '../../../shared/components/ui';

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
			<PageContainer>
				<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
					<p className='text-green-300 mb-2'>Password updated successfully.</p>
					<p className='text-purple-300 text-sm'>Redirecting...</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<FormCard title='CHANGE PASSWORD'>
				<AlertError message={error} />

				<PasswordInput
					value={oldPassword}
					onChange={(v) => { setOldPassword(v); setError(''); }}
					placeholder='Current password'
				/>

				<PasswordInput
					value={newPassword}
					onChange={(v) => { setNewPassword(v); setError(''); }}
					placeholder='New password'
				/>

				<PasswordInput
					value={confirmPasseord}
					onChange={(v) => { setConfirm(v); setError(''); }}
					placeholder='Confirm new password'
				/>

				<div className='flex justify-center mt-6'>
					<ArcadeButton onClick={handleSubmit} disabled={!!error}>
						UPDATE PASSWORD
					</ArcadeButton>
				</div>

				<div className='mt-6 text-right'>
					<LinkButton onClick={() => navigate('/profile')}>← Back to profile</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}

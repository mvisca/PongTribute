import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { apiRequestWithRefresh } from '../../../core/api/apiInterceptor';
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

	const userId = useAuthStore((state) => state.user?.id);
	const token = useAuthStore((state) => state.accessToken);
	const currentUser = useAuthStore((state) => state.user);
	const setUser = useAuthStore((state) => state.setUser);
	const setAccessToken = useAuthStore((state) => state.setAccessToken);

	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirm] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	const handleSubmit = async () => {
		setError('');

		if (!newPassword || !oldPassword) {
			setError('All fields are required');
			return;
		}

		if (newPassword !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (newPassword.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		try {
			const data = await apiRequestWithRefresh<AuthTypes.LoginSuccessResponse>(
				`/auth/${userId}/password`,
				{ method: 'PUT', body: { oldPassword, newPassword }, token: token! }
			);
			// Backend rotates tokens, update tokens
			setUser({ ...currentUser!, ...data.user });
			setAccessToken(data.token);
			setSuccess(true);
			setTimeout(() => navigate('/profile'), 1500);
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

				<div className='-mt-3'>
				<PasswordInput
					value={oldPassword}
					onChange={(v) => { setOldPassword(v); setError(''); }}
					placeholder='Current password'
				/>
				</div>
				
				<div className='-mt-3'>
				<PasswordInput
					value={newPassword}
					onChange={(v) => { setNewPassword(v); setError(''); }}
					placeholder='New password'
				/>
				</div>
				
				<div className='-mt-3'>
				<PasswordInput
					value={confirmPassword}
					onChange={(v) => { setConfirm(v); setError(''); }}
					placeholder='Confirm password'
				/>
				</div>
				
				<div className='flex justify-center mt-6'>
					<ArcadeButton onClick={handleSubmit} disabled={!oldPassword || !newPassword || !confirmPassword}>
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

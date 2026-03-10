import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { confirmPasswordReset } from '../api/authApi';
import {
	PageContainer,
	FormCard,
	PasswordInput,
	ArcadeButton,
	LinkButton,
	AlertError,
} from '../../../shared/components/ui';

export default function RecoverPasswordPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token');

	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	// Without the token the link is invalid
	if (!token) {
		return (
			<PageContainer>
				<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
					<p className='text-purple-200 mb-4'>Invalid or expired recovery link.</p>
					<ArcadeButton onClick={() => navigate('/forgot')}>REQUEST NEW LINK</ArcadeButton>
				</div>
			</PageContainer>
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
			<PageContainer>
				<div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
					<p className='text-green-300 mb-2'>Password update successfully.</p>
					<p className='text-purple-300 text-sm'>Redirecting to login...</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<FormCard title='NEW PASSWORD'>
				<AlertError message={error} />

				<PasswordInput
					value={password}
					onChange={(v) => { setPassword(v); setError(''); }}
					placeholder='New password'
				/>

				<PasswordInput
					value={confirm}
					onChange={(v) => { setConfirm(v); setError(''); }}
					placeholder='Confirm password'
				/>

				<div className='flex justify-center mt-6'>
					<ArcadeButton onClick={handleConfirm}>SET PASSWORD</ArcadeButton>
				</div>

				<div className='mt-6 text-right'>
					<LinkButton onClick={() => navigate('/login')}>← Back to login</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}

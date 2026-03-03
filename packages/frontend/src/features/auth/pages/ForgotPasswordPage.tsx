import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { requestPasswordReset } from '../api/authApi';
import { 
	PageContainer,
	FormCard,
	FormInput, 
	ArcadeButton, 
	LinkButton, 
	AlertError, 
	AlertSuccess 
} from '../../../shared/components/ui';

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
		<PageContainer>
			<FormCard title='FORGOT PASSWORD'>
				<AlertSuccess message={message} />
				<AlertError message={error} />
				<FormInput value={email} onChange={(v) => { setEmail(v); setError(''); }} placeholder='Email' error={''} />

				<div className='flex justify-center mt-6'>
					<ArcadeButton onClick={handleReset}>SEND RECOVERY EMAIL</ArcadeButton>
				</div>

				<div className='mt-6 text-right'>
					<LinkButton onClick={() => navigate('/login')}>← Back to login</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}

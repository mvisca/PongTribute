import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('auth');
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleReset() {
        setError('');
        setMessage('');

        if (!email) {
            setError(t('emailRequired'));
            return;
        }

        if (!validate(email, Validators.email)) {
            setError(t('invalidEmail'));
            return;
        }

        try {
            await requestPasswordReset(email);
            setMessage(t('recoveryEmailSent'));
        } catch {
            setMessage(t('recoveryEmailSent'));
        }
    }

    return (
        <PageContainer>
            <FormCard title={t('forgotTitle')}>
                <AlertSuccess message={message} />
                <AlertError message={error} />
                <FormInput value={email} onChange={(v) => { setEmail(v); setError(''); }} placeholder={t('email')} error={''} />

                <div className='flex justify-center mt-6'>
                    <ArcadeButton onClick={handleReset}>{t('sendRecoveryEmail')}</ArcadeButton>
                </div>

                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/login')}>{t('backToLogin', { ns: 'common' })}</LinkButton>
                </div>
            </FormCard>
        </PageContainer>
    );
}
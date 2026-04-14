import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { NAVIGATE_AFTER_MS } from '../../../shared/constants/ui.constants';

export default function RecoverPasswordPage() {
    const { t } = useTranslation('auth');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <PageContainer>
                <div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
                    <p className='text-purple-200 mb-4'>{t('invalidOrExpiredLink')}</p>
                    <ArcadeButton onClick={() => navigate('/forgot')}>{t('requestNewLink')}</ArcadeButton>
                </div>
            </PageContainer>
        );
    }

    async function handleConfirm() {
        setError('');

        if (!password || !confirm) {
            setError(t('bothFieldsRequired'));
            return;
        }

        if (!validate(password, Validators.password)) {
            setError(t('invalidPassword'));
            return;
        }

        if (password !== confirm) {
            setError(t('passwordsDoNotMatch'));
            return;
        }

        try {
            await confirmPasswordReset(token!, password);
            setSuccess(true);
            setTimeout(() => navigate('/login'), NAVIGATE_AFTER_MS);
        } catch (err: any) {
            setError(err?.message ?? t('resetFailed'));
        }
    }

    if (success) {
        return (
            <PageContainer>
                <div className='bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg text-center'>
                    <p className='text-green-300 mb-2'>{t('passwordUpdatedSuccessfully')}</p>
                    <p className='text-purple-300 text-sm'>{t('redirecting', { ns: 'common' })}</p>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <FormCard title={t('recoverTitle')}>
                <AlertError message={error} />

                <PasswordInput
                    value={password}
                    onChange={(v) => { setPassword(v); setError(''); }}
                    placeholder={t('newPassword')}
                />

                <PasswordInput
                    value={confirm}
                    onChange={(v) => { setConfirm(v); setError(''); }}
                    placeholder={t('confirmPassword')}
                />

                <div className='flex justify-center mt-6'>
                    <ArcadeButton onClick={handleConfirm}>{t('setPassword')}</ArcadeButton>
                </div>

                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/login')}>{t('backToLogin', { ns: 'common' })}</LinkButton>
                </div>
            </FormCard>
        </PageContainer>
    );
}
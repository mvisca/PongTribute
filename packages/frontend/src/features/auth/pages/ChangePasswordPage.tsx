import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { NAVIGATE_AFTER_MS } from '../../../shared/constants/ui.constants';

export default function ChangePasswordPage() {
    const { t } = useTranslation('auth');
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
            setError(t('allFieldsRequired'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            return;
        }

        if (newPassword.length < 8) {
            setError(t('passwordMinLength'));
            return;
        }

        try {
            const data = await apiRequestWithRefresh<AuthTypes.LoginSuccessResponse>(
                `/auth/${userId}/password`,
                { method: 'PUT', body: { oldPassword, newPassword }, token: token! }
            );
            setUser({ ...currentUser!, ...data.user });
            setAccessToken(data.token);
            setSuccess(true);
            setTimeout(() => navigate('/profile'), NAVIGATE_AFTER_MS);
        } catch (err: any) {
            setError(err?.message ?? t('passwordChangeFailed'));
        }
    };

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
            <FormCard title={t('changePasswordTitle')}>
                <AlertError message={error} />

                <div className='-mt-3'>
                    <PasswordInput
                        value={oldPassword}
                        onChange={(v) => { setOldPassword(v); setError(''); }}
                        placeholder={t('currentPassword')}
                    />
                </div>

                <div className='-mt-3'>
                    <PasswordInput
                        value={newPassword}
                        onChange={(v) => { setNewPassword(v); setError(''); }}
                        placeholder={t('newPassword')}
                    />
                </div>

                <div className='-mt-3'>
                    <PasswordInput
                        value={confirmPassword}
                        onChange={(v) => { setConfirm(v); setError(''); }}
                        placeholder={t('confirmPassword')}
                    />
                </div>

                <div className='flex justify-center mt-6'>
                    <ArcadeButton onClick={handleSubmit} disabled={!oldPassword || !newPassword || !confirmPassword || !!error}>
                        {t('updatePassword')}
                    </ArcadeButton>
                </div>

                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/profile')}>{t('backToProfile', { ns: 'common' })}</LinkButton>
                </div>
            </FormCard>
        </PageContainer>
    );
}
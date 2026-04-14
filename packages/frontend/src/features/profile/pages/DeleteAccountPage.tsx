import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { anonymizeAccount } from '../api/profileApi';
import {
    PageContainer,
    FormCard,
    ArcadeButton,
    LinkButton,
    AlertError,
    FormInput,
} from '../../../shared/components/ui';

export default function DeleteAccountPage() {
    const { t } = useTranslation('profile');
    const navigate = useNavigate();
    const userId   = useAuthStore((state) => state.user?.id);
    const token    = useAuthStore((state) => state.accessToken);
    const logout   = useAuthStore((state) => state.logout);

    const [input,   setInput]   = useState('');
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const confirmWord = t('deleteConfirmWord');

    const handleConfirm = async () => {
        if (!userId || !token) return;
        setLoading(true);
        setError('');
        try {
            await anonymizeAccount(userId, token);
            logout();
            navigate('/welcome');
        } catch {
            setError(t('deleteFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <FormCard title={t('deleteTitle')}>

                <AlertError message={error} />

                <p className='text-sm text-purple-300 text-center mb-2'>
                    <Trans
                        i18nKey='deleteWarning'
                        ns='profile'
                        components={{ 1: <strong className='text-red-400' /> }}
                    />
                </p>

                <p className='text-sm text-purple-300 text-center mb-6'>
                    <Trans
                        i18nKey='deleteTypeConfirm'
                        ns='profile'
                        components={{ 1: <strong className='text-purple-100' /> }}
                    />
                </p>

                <FormInput
                    value={input}
                    onChange={(v) => setInput(v)}
                    placeholder={confirmWord}
                    error=''
                />

                <div className='flex flex-col gap-4 mt-6'>
                    <ArcadeButton
                        onClick={handleConfirm}
                        disabled={input !== confirmWord || loading}
                        loading={loading}
                    >
                        {t('confirmDelete')}
                    </ArcadeButton>
                </div>

                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/profile')}>{t('backToProfile', { ns: 'common' })}</LinkButton>
                </div>

            </FormCard>
        </PageContainer>
    );
}
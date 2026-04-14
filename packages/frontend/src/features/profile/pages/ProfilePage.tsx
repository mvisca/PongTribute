import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { getProfile } from '../api/profileApi';
import {
    PageContainer,
    FormCard,
    ArcadeButton,
    LoadingScreen,
    LinkButton,
    AvatarDisplay,
    AlertError,
} from '../../../shared/components/ui';

export default function ProfilePage() {
    const { t } = useTranslation('profile');
    const { t: tCommon } = useTranslation('common');
    const { t: tAuth } = useTranslation('auth');
    const navigate = useNavigate();
    const userId = useAuthStore((state) => state.user?.id);
    const token = useAuthStore((state) => state.accessToken);

    const [profile, setProfile] = useState<UserTypes.UserPublic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!userId || !token) {
            setLoading(false);
            setError(tCommon('noSessionFound'));
            return;
        }

        const fetchProfile = async () => {
            try {
                const data = await getProfile(userId, token);
                setProfile(data);
            } catch(err) {
                setError(t('failedToLoadProfile'));
                console.error('[ProfilePage] fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId, token]);

    if (loading) return <LoadingScreen />;

    if (error || !profile) {
        return (
            <PageContainer>
                <AlertError message={error || tCommon('profileNotFound')} />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
                <FormCard title={profile.username}>
                    <div className='flex justify-center mb-4'>
                        <AvatarDisplay src={profile.avatar} size='lg' />
                    </div>

                    <p className='text-sm text-purple-300 text-center mb-1'>
                        {profile.email}
                    </p>

                    <p className='text-xs text-center mb-6'>
                        <span className={profile.isOnline ? 'text-green-400' : 'text-purple-500'}>
                            {profile.isOnline ? tCommon('online') : tCommon('offline')}
                        </span>
                    </p>

                    <div className='flex flex-col gap-5 mt-6'>

                        <ArcadeButton onClick={() => navigate('/profile/edit')}>
                            {t('editProfile')}
                        </ArcadeButton>

                        <ArcadeButton onClick={() => navigate('/profile/password')}>
                            {t('changePassword')}
                        </ArcadeButton>

                        <ArcadeButton onClick={() => navigate('/2fa')}>
                            {profile.has2FAEnabled ? tAuth('disable2FA') : tAuth('enable2FA')}
                        </ArcadeButton>

                        <ArcadeButton onClick={() => navigate('/profile/delete')}>
                            {t('deleteAccount')}
                        </ArcadeButton>

                        <ArcadeButton onClick={() => navigate('/history')}>
                            {t('history')}
                        </ArcadeButton>
                    </div>

                {/* Botón volver */}
                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/lobby')}>{tCommon('back')}</LinkButton>
                </div>
                </FormCard>
        </PageContainer>
    );
}
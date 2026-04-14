import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AvatarDisplay } from '../../../shared/components/ui';
import { MatchConstants } from '@transcendence/shared/constants/match.constants.js';

const INVITE_TIMEOUT_S = MatchConstants.PRIVATE_INVITATION_TIMEOUT_MS / 1000;

interface Props{
    friendUsername: string;
    friendAvatar: string;
    rejectedBy?: string;
    expired?: boolean;
    onExpired?: () => void;
    onCancel: () => void;
    onPlayBot: () => void;
}

export default function FriendWaiting({friendUsername, friendAvatar, rejectedBy, expired, onExpired, onCancel, onPlayBot}: Props) {
    const { t } = useTranslation('lobby');
    const [remaining, setRemaining] = useState(INVITE_TIMEOUT_S);

    useEffect(() => {
        if (rejectedBy || expired) return;
        const interval = setInterval(() => {
            setRemaining(s => {
                if (s <= 1) { clearInterval(interval); onExpired?.(); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [rejectedBy, expired, onExpired]);

    return (
        <div className='w-full h-full flex flex-col items-center justify-center gap-8'>
            <h2 className='text-2xl tracking-widest'>{t('waitingFor')}</h2>
            <AvatarDisplay src={friendAvatar} size='md' />
            <p className='text-xl text-purple-300 tracking-widest'>{friendUsername}</p>

            <div className='text-4xl font-bold tracking-normal h-[3rem] flex items-center justify-center'>
                {rejectedBy
                    ? <span className='text-base font-normal text-yellow-500'>{t('declinedInvitation', { username: rejectedBy })}</span>
                    : (expired || remaining === 0)
                        ? <span className='text-base font-normal text-yellow-500'>{t('expiredRequest')}</span>
                        : `${remaining}s`
                }
            </div>

            <div className='flex gap-8 mt-4'>
                <button
                    className='arcade-btn px-6 py-2 text-base'
                    onClick={onCancel}
                >
                    {t('cancel', { ns: 'common' })}
                </button>
                <button
                    className='arcade-btn px-6 py-2 text-base'
                    onClick={onPlayBot}
                >
                    {t('playVsBot')}
                </button>
            </div>
        </div>
    );
}
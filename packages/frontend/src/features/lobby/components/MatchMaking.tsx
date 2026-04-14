import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchConstants } from '@transcendence/shared/constants/match.constants.js';

const QUEUE_TIMEOUT_S = MatchConstants.QUEUE_TIMEOUT_MS / 1000;

interface Props {
    gameMode: string;
    expired?: boolean;
    onExpired?: () => void;
    onCancel: () => void;
    onPlayBot: () => void;
}

export default function MatchMaking({ gameMode, expired, onExpired, onCancel, onPlayBot }: Props) {
    const { t } = useTranslation('lobby');
    const [remaining, setRemaining] = useState(QUEUE_TIMEOUT_S);

    useEffect(() => {
        if (expired) return;
        const interval = setInterval(() => {
            setRemaining(s => {
                if (s <= 1) { clearInterval(interval); onExpired?.(); return 0; }
                return s -1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [expired, onExpired]);

    return (
        <div className='w-full h-full flex flex-col items-center justify-center gap-8'>
            <h2 className='text-2xl tracking-widest'>{t('searchingOpponent')}</h2>
            <p className='text-sm opacity-70'>{t('mode', { mode: gameMode })}</p>
            <div className='text-4xl font-bold tracking-normal h-[3rem] flex items-center justify-center'>
                {expired || remaining === 0
                    ? <span className='text-base font-normal text-yellow-500'>{t('noOpponentFound')}</span>
                    : `${remaining}s`
                }
            </div>
            <div className='flex gap-8 mt-4'>
                <button className='arcade-btn px-6 py-2 text-base' onClick={onCancel}>{t('cancel', { ns: 'common' })}</button>
                <button className='arcade-btn px-6 py-2 text-base' onClick={onPlayBot}>{t('playVsBot')}</button>
            </div>
        </div>
    );
}
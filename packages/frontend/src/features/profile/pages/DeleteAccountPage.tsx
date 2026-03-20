import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const userId   = useAuthStore((state) => state.user?.id);
    const token    = useAuthStore((state) => state.accessToken);
    const logout   = useAuthStore((state) => state.logout);

    const [input,   setInput]   = useState('');
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!userId || !token) return;
        setLoading(true);
        setError('');
        try {
            await anonymizeAccount(userId, token);
            logout();
            navigate('/welcome');
        } catch {
            setError('Failed to delete account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <FormCard title='DELETE ACCOUNT'>

                <AlertError message={error} />

                <p className='text-sm text-purple-300 text-center mb-2'>
                    This action is <span className='text-red-400 font-bold'>irreversible</span>.
                    Your account and personal data will be permanently deleted.
                </p>

                <p className='text-xs text-purple-400 text-center mb-6'>
                    Type <span className='text-white font-mono'>DELETE</span> to confirm.
                </p>

                <FormInput
                    value={input}
                    onChange={(v) => setInput(v)}
                    placeholder='DELETE'
                    error=''
                />

                <div className='flex flex-col gap-4 mt-6'>
                    <ArcadeButton
                        onClick={handleConfirm}
                        disabled={input !== 'DELETE' || loading}
                        loading={loading}
                    >
                        CONFIRM DELETE
                    </ArcadeButton>
                </div>

                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/profile')}>← Back</LinkButton>
                </div>

            </FormCard>
        </PageContainer>
    );
}
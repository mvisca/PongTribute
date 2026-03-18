import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { PageContainer, FormCard, LinkButton, ArcadeButton, AlertError, FormInput, PasswordInput } from '../../../shared/components/ui';
import { enable2FA, verify2FASetup, disable2FA } from '../api/authApi';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import type { AuthTypes } from '@transcendence/shared/types/auth.types.js';

export default function TwoFactorPage() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const userId = useAuthStore((state) => state.user?.id);
    const token = useAuthStore((state) => state.accessToken);
    const setUser = useAuthStore((state) => state.setUser);
    const setAccessToken = useAuthStore((state) => state.setAccessToken);

    const [error, setError] = useState('');
    const [setupData, setSetupData] = useState<AuthTypes.Enable2FAResponse | null>(null);
    const [totpCode, setTotpCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!user?.has2FAEnabled && !setupData) {
			setLoading(true);
			handleStartActivation().finally(() => setLoading(false));
		}
	}, []);
	


    async function handleStartActivation() {
        setError('');
        if (!userId || !token) return;
        try {
            const data = await enable2FA(userId, token);
            setSetupData(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to start 2FA setup');
        }
    }
    async function handleConfirmSetup() {
        setError('');
        if (!userId || !token || !setupData) return;
        if (!validate(totpCode, Validators.totpCode)) {
            setError(Validators.totpCode.message);
            return;
        }
        try {
            const data = await verify2FASetup(userId, setupData.setupToken, totpCode, token);
            setUser({ ...user!, ...data.user });
            setAccessToken(data.token);
            setSetupData(null);
            setTotpCode('');
            navigate('/profile');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to confirm 2FA');
        }
    }

    async function handleDisable2FA() {
        setError('');
        if (!userId || !token) return;
        if (!disablePassword) {
            setError('Password is required to disable 2FA');
            return;
        }
        try {
            const data = await disable2FA(userId, disablePassword, token);
            setUser({ ...user!, ...data.user });
            setAccessToken(data.token);
            setDisablePassword('');
            navigate('/profile');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
        }
    }
    return (
        <PageContainer>
            <FormCard title='2FA'>
                <AlertError message={error} />

                <p className="text-sm text-purple-300 text-center mb-4">
                 {user?.has2FAEnabled ? '2FA is enabled' : '2FA is disabled'}
                </p>
                {loading && (
					<p className="text-sm text-purple-300 text-center mt-6">Loading...</p>
				)}
                {setupData && (
                    <div className="mt-6 flex flex-col items-center gap-4">
                        <p className="text-sm text-purple-200 text-center">
                            Step 1: Scan this QR code with your authenticator app.
                        </p>

                        <img
                            src={setupData.qr}
                            alt="2FA QR code"
                            className="w-40 h-40 border border-purple-500 rounded shadow-lg"
                        />

                        <p className="text-sm text-purple-200 text-center mt-2">
                            Step 2: Enter the 6-digit code from your app.
                        </p>
                        <div className="-mt-2 w-full max-w-[200px]">
                            <FormInput
                                value={totpCode}
                                onChange={(v) => {
                                    const next = v.replace(/\D/g, '').slice(0, 6);
                                    setTotpCode(next);
                                    setError('');
                                  }}
                                placeholder="000000"
                                error=""
                            />
                        </div>
                        <div className="text-sm text-purple-200 text-center max-w-xs">
                        <p className="mb-1">Keep save your backup code:</p>
                        <p className="font-mono text-sm text-purple-100 mb-1">
                            {setupData.backupCode}
                        </p>
                        </div>
                        <div className="flex justify-center mt-4">
                            <ArcadeButton onClick={handleConfirmSetup} disabled={totpCode.length !== 6}>
                                CONFIRM 2FA
                            </ArcadeButton>
                        </div>
                    </div>
                )}
                {user?.has2FAEnabled && (
                    <div className="mt-6 flex flex-col items-center gap-4">
                        <p className="text-xs text-purple-400 text-center">
                            Enter your password to disable it.
                        </p>
                        <div className="-mt-2 w-full max-w-[280px]">
                            <PasswordInput
                                value={disablePassword}
                                onChange={(v) => { setDisablePassword(v); setError(''); }}
                                placeholder="Your password"
                            />
                        </div>
                        <div className="flex justify-center mt-4">
                            <ArcadeButton onClick={handleDisable2FA} disabled={!disablePassword.trim()}>
                                DISABLE 2FA
                            </ArcadeButton>
                        </div>
                    </div>
                )}
                <div className="mt-6 text-right">
                 <LinkButton onClick={() => navigate('/profile')}>← Back to profile</LinkButton>
                </div>
            </FormCard>
        </PageContainer>
    );
}

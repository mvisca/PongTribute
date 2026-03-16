import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { verify2FALogin, verifyBackupCode } from '../api/authApi';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { getProfile } from '../../profile/api/profileApi';
import {
	PageContainer,
	FormCard,
	FormInput,
	ArcadeButton,
	LinkButton,
	AlertError,
} from '../../../shared/components/ui';

export default function Verify2FALoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const authLogin = useAuthStore((state) => state.login);
	const setAvatar = useAuthStore((state) => state.setAvatar);

	const provisionalToken = (location.state as { provisionalToken?: string } | null)?.provisionalToken;

	const [totpCode, setTotpCode] = useState('');
	const [error, setError] = useState('');
	const [useBackup, setUseBackup] = useState(false);
	const [backupCode, setBackupCode] = useState('');

	useEffect(() => {
		if (!provisionalToken) {
			navigate('/login', { replace: true });
		}
	}, [provisionalToken, navigate]);

	async function handleVerify() {
		setError('');
		if (!provisionalToken) return;
		if (useBackup) {
			if (!validate(backupCode, Validators.backupCode)) {
				setError(Validators.backupCode.message);
				return;
			}
			try {
				const data = await verifyBackupCode(provisionalToken, backupCode);
				authLogin(data.user, data.token);
				await getProfile(data.user.id, data.token).then((p) => setAvatar(p.avatar ?? null)).catch(() => {});
				navigate('/profile');
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : 'Invalid backup code');
			}
		} else {
			if (!validate(totpCode, Validators.totpCode)) {
				setError(Validators.totpCode.message);
				return;
			}
			try {
				const data = await verify2FALogin(provisionalToken, totpCode);
				authLogin(data.user, data.token);
				await getProfile(data.user.id, data.token).then((p) => setAvatar(p.avatar ?? null)).catch(() => {});
				navigate('/profile');
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : 'Invalid code');
			}
		}
	}

	if (!provisionalToken) {
		return null;
	}

	return (
		<PageContainer>
			<FormCard title="VERIFY 2FA">
				<AlertError message={error} />
				<p className="text-sm text-purple-300 text-center mb-4">
					Enter the 6-digit code from your authenticator app.
				</p>
				{!useBackup ? (
					<>
						<div className="-mt-2 w-full max-w-[200px] mx-auto">
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
						<div className="flex justify-center mt-4">
							<ArcadeButton onClick={handleVerify}>VERIFY</ArcadeButton>
						</div>
						<div className="mt-4 text-center">
							<LinkButton onClick={() => setUseBackup(true)}>
								Use backup code instead
							</LinkButton>
						</div>
					</>
				) : (
					<>
						<p className="text-xs text-purple-400 text-center mb-2">
							Format: XXXX-XXXX (this will disable 2FA)
						</p>
						<div className="-mt-2 w-full max-w-[220px] mx-auto">
						<FormInput
							value={backupCode}
							onChange={(v) => {
								const hex = v.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8);
								const next =
									hex.length <= 4
										? (hex.length === 0 ? '' : hex + '-')
										: `${hex.slice(0, 4)}-${hex.slice(4)}`;
								setBackupCode(next);
								setError('');
							}}
							placeholder="XXXX-XXXX"
							error=""
						/>
						</div>
						<div className="flex justify-center mt-4">
							<ArcadeButton onClick={handleVerify}>VERIFY BACKUP</ArcadeButton>
						</div>
						<div className="mt-4 text-center">
							<LinkButton onClick={() => setUseBackup(false)}>
								Use app code instead
							</LinkButton>
						</div>
					</>
				)}
				<div className="mt-6 text-right">
					<LinkButton onClick={() => navigate('/login')}>← Back to login</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}
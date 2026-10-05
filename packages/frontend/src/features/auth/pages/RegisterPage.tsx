import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Validators, validate } from '@transcendence/shared/utils/validators.js';
import { register } from '../api/authApi';
import { useAuthStore } from '../../../core/auth/AuthStore';
import {
    PageContainer,
    FormCard,
    FormInput,
    PasswordInput,
    ArcadeButton,
    LinkButton,
    AlertError,
    AvatarUploader,
    LoadingScreen,
} from '../../../shared/components/ui';
import { getProfile } from '../../profile/api/profileApi';

type ErrorsState = {
    username: string,
    email: string,
    password: string
}

export default function RegisterPage() {
    const { t } = useTranslation('auth');
    const navigate = useNavigate();
    const authLogin = useAuthStore((state) => state.login);
    const setAvatar = useAuthStore((state) => state.setAvatar);

    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<ErrorsState>({
        username: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

    const validateInputs = () => {
        const usernameError = validate(username, Validators.username)
            ? ''
            : t('invalidUsername');

        const emailError = validate(email, Validators.email)
            ? ''
            : t('invalidEmail');

        const passwordError = validate(password, Validators.password)
            ? ''
            : t('invalidPassword');

        setErrors({ username: usernameError, email: emailError, password: passwordError });

        return !usernameError && !emailError && !passwordError;
    };

    const clearErrors = () => {
        setErrors({ username: '', email: '', password: ''});
        setError('');
    }

    async function handleRegister() {
        setError('');

        if (!validateInputs()) return;

        setLoading(true);

        try {
            const data = await register(username, email, password, avatarBase64 ?? undefined);

            authLogin(data.user, data.token);

            getProfile(data.user.id, data.token)
                .then(profile => setAvatar(profile.avatar ?? null))
                .catch(() => {});

            navigate('/profile');

        } catch (err: any) {
            setLoading(false);
            setError(err?.message ?? t('registerFailed'));
        }
    }
    if (loading) return <LoadingScreen />;

    return (
        <PageContainer>
            <div className='flex flex-col items-center'>
                <FormCard title={t('register')}>
                    <AlertError message={error} />

                    <FormInput
                        value={username}
                        onChange={(value) => { setUsername(value); clearErrors();}}
                        placeholder={t('username')}
                        error={errors.username}
                    />

                    <div className='-mt-3'>
                        <FormInput
                            value={email}
                            onChange={(value) => { setEmail(value); clearErrors();}}
                            placeholder={t('email')}
                            error={errors.email}
                        />
                    </div>

                    <div className='-mt-3'>
                        <AvatarUploader
                            onFileChange={setAvatarBase64}
                            onError={(msg) => setError(msg)}
                        />
                    </div>

                    <div className='mt-7'>
                        <PasswordInput
                            value={password}
                            onChange={(value) => { setPassword(value); clearErrors();}}
                            placeholder={t('password')}
                            error={errors.password}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }}
                        />
                    </div>

                    <div className='flex justify-center mt-6'>
                        <ArcadeButton
                            onClick={handleRegister}
                            disabled={!!error || Object.values(errors).some(err => err !== '')}
                        >
                            {t('register')}
                        </ArcadeButton>
                    </div>

                    {/* OAuth Divider */}
                    <div className='relative my-6'>
                        <div className='absolute inset-0 flex items-center'>
                            <span className='w-full border-t border-purple-800'></span>
                        </div>
                        <div className='relative flex justify-center text-sm'>
                            <span className='px-2 bg-black text-purple-400'>or continue with</span>
                        </div>
                    </div>

                    {/* OAuth Buttons */}
                    <div className='flex flex-col gap-3'>
                        <a href='/api/auth/oauth/42/authorize' className='w-full'>
                            <ArcadeButton className='w-full'>Sign in with 42</ArcadeButton>
                        </a>
                        <a href='/api/auth/oauth/google/authorize' className='w-full'>
                            <ArcadeButton className='w-full'>Sign in with Google</ArcadeButton>
                        </a>
                        <a href='/api/auth/oauth/github/authorize' className='w-full'>
                            <ArcadeButton className='w-full'>Sign in with GitHub</ArcadeButton>
                        </a>
                    </div>

                    <div className='mt-6 text-right'>
                        <LinkButton onClick={() => navigate('/login')}>{t('backToLogin', { ns: 'common' })}</LinkButton>
                    </div>
                </FormCard>
            </div>
        </PageContainer>
    );
}
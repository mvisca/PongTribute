import { useNavigate } from 'react-router-dom';
import { PageContainer, FormCard, LinkButton } from '../../../shared/components/ui';

export default function TwoFactorPage() {
    const navigate = useNavigate();

    return (
        <PageContainer>
            <FormCard title='2FA'>

                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/profile')}>
                        ← Back to profile
                    </LinkButton>
                </div>

            </FormCard>
        </PageContainer>
    );
}

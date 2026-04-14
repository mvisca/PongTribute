import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer, FormCard, LinkButton } from '../../../shared/components/ui';

export default function TermsPage() {
    const { t } = useTranslation('legal');
    const { t: tCommon } = useTranslation('common');
    const navigate = useNavigate();

    return (
        <PageContainer>
            <FormCard title={t('termsTitle')} wide>
                <div className='text-purple-300 text-xs leading-relaxed space-y-4'>
                    <p>{t('termsIntro')}</p>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('termsUseTitle')}</p>
                        <p>{t('termsUseText')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('termsResponsibilityTitle')}</p>
                        <p>{t('termsResponsibilityText')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('termsProhibitionsTitle')}</p>
                        <p>{t('termsProhibitionsText')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('termsThirdPartyTitle')}</p>
                        <p>{t('termsThirdPartyText1')}</p>
                        <p className='mt-1'>{t('termsThirdPartyText2')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('termsConsequencesTitle')}</p>
                        <p>{t('termsConsequencesText')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('termsEducationalTitle')}</p>
                        <p>{t('termsEducationalText')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('contactTitle')}</p>
                        <p>{t('contactTerms')} <a href='mailto:pong.42.barcelona@gmail.com' className='text-purple-400 hover:text-white transition-colors'>pong.42.barcelona@gmail.com</a></p>
                    </div>
                </div>

                <div className='text-right mt-6'>
                    <LinkButton onClick={() => navigate(-1)}>{tCommon('back')}</LinkButton>
                </div>
            </FormCard>
        </PageContainer>
    );
}
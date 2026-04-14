import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer, FormCard, LinkButton } from '../../../shared/components/ui';

const mailLink = 'mailto:pong.42.barcelona@gmail.com';
const linkClass = 'text-purple-400 hover:text-white transition-colors';

export default function PrivacyPage() {
    const { t } = useTranslation('legal');
    const { t: tCommon } = useTranslation('common');
    const navigate = useNavigate();

    return (
        <PageContainer>
            <FormCard title={t('privacyTitle')} wide>
                <div className='text-purple-300 text-xs leading-relaxed space-y-4'>
                    <p>{t('privacyIntro')}</p>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('dataCollectTitle')}</p>
                        <ul className='list-disc list-inside space-y-1'>
                            <li>{t('dataCollect1')}</li>
                            <li>{t('dataCollect2')}</li>
                            <li>{t('dataCollect3')}</li>
                        </ul>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('dataUseTitle')}</p>
                        <ul className='list-disc list-inside space-y-1'>
                            <li>{t('dataUse1')}</li>
                            <li>{t('dataUse2')}</li>
                            <li>{t('dataUse3')}</li>
                        </ul>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('dataShareTitle')}</p>
                        <ul className='list-disc list-inside space-y-1'>
                            <li>{t('dataShare1')}</li>
                            <li>{t('dataShare2')}</li>
                            <li>{t('dataShare3')}</li>
                        </ul>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('thirdPartyTitle')}</p>
                        <p className='mb-2'>{t('thirdPartyIntro')}</p>
                        <ul className='list-disc list-inside space-y-1'>
                            <li><strong>Cloudinary</strong> (res.cloudinary.com): {t('thirdPartyCloudinary')} {t('thirdPartyCloudinaryPolicy')} <a href='https://cloudinary.com/privacy' target='_blank' rel='noopener noreferrer' className={linkClass}>cloudinary.com/privacy</a>.</li>
                            <li><strong>Google Fonts</strong> (fonts.googleapis.com, fonts.gstatic.com): {t('thirdPartyGoogleFonts')} {t('thirdPartyGooglePolicy')} <a href='https://policies.google.com/privacy' target='_blank' rel='noopener noreferrer' className={linkClass}>policies.google.com/privacy</a>.</li>
                        </ul>
                        <p className='mt-2'>{t('thirdPartyBlocking')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('protectTitle')}</p>
                        <p>{t('protectText')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('rightsTitle')}</p>
                        <p>{t('rightsText')} <a href={mailLink} className={linkClass}>pong.42.barcelona@gmail.com</a></p>
                        <p className='mt-1'>{t('rightsDelete')}</p>
                    </div>

                    <div>
                        <p className='text-white font-bold mb-1'>{t('contactTitle')}</p>
                        <p>{t('contactPrivacy')} <a href={mailLink} className={linkClass}>pong.42.barcelona@gmail.com</a></p>
                    </div>
                </div>

                <div className='text-right mt-6'>
                    <LinkButton onClick={() => navigate(-1)}>{tCommon('back')}</LinkButton>
                </div>
            </FormCard>
        </PageContainer>
    );
}
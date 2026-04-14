import { useTranslation } from 'react-i18next';

interface Props {
  message?: string;
}

export default function LoadingScreen({ message }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className='retro-bg flex items-center justify-center min-h-screen'>
      <p className='text-purple-300'>{message ?? t('loading')}</p>
    </div>
  );
}

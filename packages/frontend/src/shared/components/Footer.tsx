import { useTranslation } from 'react-i18next';

export default function Footer() {
    const { t } = useTranslation('home');

    const authors = [
        { alias: 'mvisca',   url: 'https://github.com/mvisca'   },
        { alias: 'jocuni-p', url: 'https://github.com/jocuni-p' },
        { alias: 'dkurcbar', url: 'https://github.com/dKurbi'   },
        { alias: 'meriusky', url: 'https://github.com/meriusky'  },
    ];

    return (
        <footer className='bg-purple-900 border-t border-purple-700 px-6 py-3 text-purple-400 text-xs'>
            <div className='flex items-center justify-between gap-4'>

                {/* Izquierda: autores y año */}
                <div className='flex flex-col gap-1'>
                    <p>© {new Date().getFullYear()} PONG🏓TRIBUTE</p>
                    <div className='flex flex-wrap gap-3'>
                        {authors.map((a) => (
                            <a
                                key={a.alias}
                                href={a.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='hover:text-white transition-colors'
                            >
                                {a.alias}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Derecha: links legales */}
                <div className='flex flex-col items-end gap-1 shrink-0'>
                    <a href='/privacy' className='hover:text-white transition-colors'>{t('privacyPolicy')}</a>
                    <a href='/terms'   className='hover:text-white transition-colors'>{t('termsOfService')}</a>
                </div>

            </div>
        </footer>
    );
}
//packages/frontend/src/shared/components/Footer.tsx
export default function Footer() {
	const authors = [
		{ alias: 'mvisca',   url: 'https://github.com/mvisca'   },
		{ alias: 'jocuni-p', url: 'https://github.com/jocuni-p' },
		{ alias: 'dKurbi',   url: 'https://github.com/dKurbi'   },
		{ alias: 'meriusky', url: 'https://github.com/meriusky'  },
	];

return (
    <footer className='bg-purple-900 border-t border-purple-700 px-6 py-3 text-purple-400 text-xs'>
        <div className='flex items-center justify-between'>
            
            {/* Spacer izquierdo para centrar */}
            <div className='w-48' />

            {/* Centro: autores y año */}
            <div className='flex flex-col items-center gap-1'>
				<p>© {new Date().getFullYear()} PING🏓PONG</p>
                <div className='flex flex-wrap justify-center gap-3'>
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
            <div className='flex flex-col items-end gap-1 w-48'>
                <a href='/privacy' className='hover:text-white transition-colors'>Privacy Policy</a>
                <a href='/terms'   className='hover:text-white transition-colors'>Terms of Service</a>
            </div>

        </div>
    </footer>
);
}
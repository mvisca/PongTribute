import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../core/auth/AuthStore';
import { logout as logoutApi } from '../../features/auth/api/authApi';
import { AvatarDisplay, LanguageSwitcher } from './ui';
import { useFriendsStore } from '../../features/friends/store/friendsStore';
import { useSoundStore } from '../../core/sound/soundStore';

type NavItem = {
    icon: string;
    label: string;
    path?: string;
    action?: () => void;
    danger?: boolean;
}

export default function Navbar() {
    const { t } = useTranslation('nav');
    const navigate = useNavigate();

    const username          = useAuthStore((state) => state.user?.username);
    const avatar            = useAuthStore((state) => state.avatar);
    const token             = useAuthStore((state) => state.accessToken);
    const authLogout        = useAuthStore((state) => state.logout);
    const isAuthenticated   = useAuthStore((state) => state.isAuthenticated);

    const resetFriends      = useFriendsStore((state) => state.reset);

	const muted       = useSoundStore((state) => state.muted);
	const toggleMute = useSoundStore((state) => state.toggleMute);
	
    const [menuOpen, setMenuOpen] = useState(false);

    // Navbar mínima para páginas públicas (login, register, etc.)
    if (!isAuthenticated) {
        return (
            <nav className='fixed top-0 left-0 right-0 z-50 bg-purple-900 border-b border-purple-700 px-6 py-3 flex items-center justify-between'>
                <span className='text-purple-300 font-bold text-lg tracking-widest'>
                    PONG🏓TRIBUTE
                </span>
                <LanguageSwitcher />
            </nav>
        );
    }

    const handleLogout = async() => {
        try {
            await logoutApi(token!);
        } catch {}
        resetFriends();
        authLogout();
        navigate('/login');
    };

    const navItems: NavItem[] = [
        { icon: '👤', label: t('profile'),  path: '/profile' },
        { icon: '👥', label: t('friends'),  path: '/friends' },
        { icon: '🕹️', label: t('play'),     path: '/home' },
    ];

    const handleNav = (item: NavItem) => {
        setMenuOpen(false);
        if (item.action) item.action();
        else if (item.path) navigate(item.path);
	};
	
	const IconSoundOn = (
		<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
			<path d='M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z'/>
			<path d='M18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z'/>
			<path d='M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z'/>
		</svg>
	);

	const IconSoundOff = (
		<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
			<path d='M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z'/>
			<line x1='22' y1='6' x2='14' y2='18' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/>
		</svg>
	);

    return (
        <>
            <nav className='fixed top-0 left-0 right-0 z-50 bg-purple-900 border-b border-purple-700 px-6 py-3 flex items-center justify-between'>
                <span className='text-purple-300 font-bold text-lg tracking-widest'>
                    PONG🏓TRIBUTE
                </span>

                <div className='flex items-center gap-4 ml-auto'>
                    {/* Selector de idioma — siempre visible en desktop */}
                    <div className='hidden sm:block'>
                        <LanguageSwitcher />
					</div>
					
					{/* Botón de sonido — desktop */}
					<button
						onClick={toggleMute}
						className='hidden sm:block text-purple-300 hover:text-white transition-colors px-2'
						aria-label={muted ? 'Activar sonido' : 'Silenciar'}
						title={muted ? 'Activar sonido' : 'Silenciar'}
					>
						{muted ? IconSoundOff : IconSoundOn}
					</button>
					

                    {/* Avatar + username — solo visible en desktop */}
                    <button
                        onClick={() => navigate('/profile')}
                        className='hidden sm:flex items-center gap-2 hover:bg-purple-800 px-2 py-1 rounded-lg transition-colors cursor-pointer'
                    >
                        <AvatarDisplay src={avatar} size='sm' />
                        <span className='text-sm text-purple-300'>{username}</span>
                    </button>

                    {/* Logout — solo visible en desktop */}
                    <button
                        onClick={handleLogout}
                        className="hidden sm:block text-purple-300 hover:text-red-400 transition-colors text-2xl px-2"
                        aria-label={t('logout')}
                        title={t('logout')}
                    >
                        ⏻
                    </button>

                    {/* Hamburguesa — solo visible en móvil */}
                    <button
                        onClick={() => setMenuOpen(true)}
                        className='sm:hidden text-purple-300 hover:text-white text-2xl px-2'
                        aria-label={t('openMenu')}
                    >
                        ☰
                    </button>
                </div>
            </nav>

            {/*Overlay*/}
            {menuOpen && (
                <div
                    className='fixed inset-0 z-50 bg-purple-950/95 backdrop-blur-sm flex flex-col'
                    onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false);}}
                >
                    {/*Header overlay*/}
                    <div className='flex items-center justify-between px-8 py-6 border-b border-purple-700'>
                        <span className='text-purple-400 hover:text-white text-2xl transition-colors'>
                            👾 {username}
                        </span>
                        <button
                            onClick={() => setMenuOpen(false)}
                            className='text-purple-400 hover:text-white text-2xl transition-colors'
                            aria-label={t('closeMenu')}
                        >
                            x
                        </button>
                    </div>

                    {/*Navigation items*/}
                    <nav className='flex flex-col items-center justify-center flex-1 gap-2 px-8'>
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNav(item)}
                                className='w-full max-w-sm flex items-center gap-6 px-8 py-4 rounded-xl text-purple-200 hover:text-white hover:bg-purple-800 transition-all duration-150 text-left group'
                            >
                                <span className='text-2xl w-8 text-center'>{item.icon}</span>
                                <span className='text-lg font-bold tracking-widest group-hover:translate-x-1 transition-transform'>
                                    {item.label}
                                </span>
                            </button>
                        ))}

						{/* Botón de sonido — móvil */}
						<button
							onClick={toggleMute}
							className='w-full max-w-sm flex items-center gap-6 px-8 py-4 rounded-xl text-purple-200 hover:text-white hover:bg-purple-800 transition-all duration-150 text-left group'
						>
							<span className='w-8 flex justify-center'>
								{muted ? IconSoundOff : IconSoundOn}
							</span>
							<span className='text-lg font-bold tracking-widest group-hover:translate-x-1 transition-transform'>
								{muted ? 'Sonido off' : 'Sonido on'}
							</span>
						</button>
						
                        {/* Separador */}
                        <div className='w-full max-w-sm border-t border-purple-700 my-2' />

                        {/* Selector de idioma en móvil */}
                        <div className='w-full max-w-sm flex justify-center py-2'>
                            <LanguageSwitcher />
                        </div>

                        {/* Separador */}
                        <div className='w-full max-w-sm border-t border-purple-700 my-2' />

                        {/*Logout*/}
                        <button
                            onClick={() => { setMenuOpen(false); handleLogout();}}
                            className='w-full max-w-sm flex items-center gap-6 px-8 py-4 rounded-xl text-red-400 hover:text-red-200 hover:bg-red-900/30'
                        >
                            <span className='text-2xl w-8 text-center'>🚪</span>
                            <span className='text-lg font-bold tracking-widest group-hover:translate-x-1 transition'>
                                {t('logout')}
                            </span>
                        </button>
                    </nav>
                </div>
            )}
        </>
    );
}
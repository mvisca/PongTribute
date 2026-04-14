import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../core/auth/AuthStore';
import { logout as logoutApi } from '../../features/auth/api/authApi';
import { AvatarDisplay, LanguageSwitcher } from './ui';
import { useFriendsStore } from '../../features/friends/store/friendsStore';

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
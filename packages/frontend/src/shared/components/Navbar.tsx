import { useNavigate } from "react-router-dom";
import { useAuth } from '../../core/auth/AuthContext';
import { logout as logoutApi } from '../../features/auth/api/authApi';

export default function Navbar() {
	const navigate = useNavigate();

    const username       = useAuth((state) => state.user?.username);
    const token          = useAuth((state) => state.accessToken);
    const authLogout     = useAuth((state) => state.logout);
    const isAuthenticated = useAuth((state) => state.isAuthenticated);

	if (!isAuthenticated) return null;

	const handleLogout = async() => {
		try {
			await logoutApi(token!);
		} catch {}

		authLogout();
		navigate('/login');
	};

    return (
        <nav className='fixed top-0 left-0 right-0 z-50 bg-purple-900 border-b border-purple-700 px-6 py-3 flex items-center justify-between'>
            <button
                onClick={() => navigate('/home')}
                className='text-purple-300 font-bold text-lg tracking-widest hover:text-white transition-colors'
            >
                PING🏓PONG
            </button>

            <div className='flex items-center gap-4'>
                <button
                    onClick={() => navigate('/profile')}
                    className='text-sm text-purple-200 hover:text-white transition-colors'
                >
                    {username}
                </button>
				
                <button
                    onClick={handleLogout}
                    className='neon-btn px-4 py-1 text-xs'
                >
                    LOGOUT
                </button>
            </div>
        </nav>
    );
}
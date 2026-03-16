import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

import Navbar from '../../shared/components/Navbar';

import { RootRedirect } from './RootRedirect';
import PublicHomePage from '../../features/home/pages/PublicHomePage';
import RegisterPage from '../../features/auth/pages/RegisterPage';
import LoginPage from '../../features/auth/pages/LoginPage';
import ForgotPasswordPage from '../../features/auth/pages/ForgotPasswordPage';
import RecoverPasswordPage from '../../features/auth/pages/RecoverPasswordPage';
import EditProfilePage from '../../features/auth/pages/EditProfilePage';
import ChangePasswordPage from '../../features/auth/pages/ChangePasswordPage';
import ProfilePage from '../../features/profile/pages/ProfilePage';
import FriendsPage from '../../features/friends/pages/FriendsPage';
import Footer from '../../shared/components/Footer';
import PrivacyPage from '../../features/home/pages/PrivacyPage';
import TermsPage from '../../features/home/pages/TermsPage';
import LobbyPage from '../../features/lobby/pages/LobbyPage';
import { useAuthStore } from '../auth/AuthStore';
import TwoFactorPage from '../../features/auth/pages/TwoFactorPage';
import HistoryPage from '../../features/auth/pages/HistoryPage';
import TempPage from '../../features/home/pages/TempPage';

export function AppRouter() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	return (
		<BrowserRouter>
			<div className='flex flex-col h-screen'>
				<Navbar />
				<div className={`flex-1 overflow-y-auto ${isAuthenticated ? 'pt-14' : ''}`}>
					<Routes>
						{/* Root redirect */}
						<Route path="/" element={<RootRedirect />} />

						{/* Public routes */}
						<Route path='/welcome' element={<PublicHomePage />} />
						<Route path="/login" element={<LoginPage />} />
						<Route path="/register" element={<RegisterPage />} />
						<Route path="/verify-2fa" element={<div>Verify 2FA Page</div>} />
						<Route path="/forgot" element={<ForgotPasswordPage />} />
						<Route path="/recover" element={<RecoverPasswordPage />} />
						<Route path="/privacy" element={<PrivacyPage />} />
						<Route path="/terms"   element={<TermsPage />} />

						{/* Protected routes */}
						{/* <Route path="/home" element={<ProtectedRoute><div>Coming soon</div></ProtectedRoute>} /> */}
						<Route path="/home" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>}/>
						<Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
						<Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
						<Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
						<Route path="/profile/password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
						<Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
						<Route path='/2fa' element={<TwoFactorPage />} />
						<Route path='/history' element={<HistoryPage />} />
						<Route path='/temp' element={<ProtectedRoute><TempPage /></ProtectedRoute>} />
						
						{/* 404 */}
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</div>
				<Footer />
			</div>
		</BrowserRouter>
	);
}
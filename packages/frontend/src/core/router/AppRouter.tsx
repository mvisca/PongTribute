import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';

import Navbar from '../../shared/components/Navbar';

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

export function AppRouter() {
	return (
		<BrowserRouter>
			<Navbar />
			<div className='pt-14'>
				<Routes>
					{/* Public routes */}
					<Route path="/" element={<PublicHomePage />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/verify-2fa" element={<div>Verify 2FA Page</div>} />
					<Route path="/forgot" element={<ForgotPasswordPage />} />
					<Route path="/recover" element={<RecoverPasswordPage />} />
					<Route path="/privacy" element={<PrivacyPage />} />
					<Route path="/terms"   element={<TermsPage />} />

					{/* Protected routes */}
					<Route path="/home" element={<ProtectedRoute><div>Coming soon</div></ProtectedRoute>} />
					<Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
					<Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
					<Route path="/profile/password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
					<Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />

					{/* 404 */}
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>
			<Footer /> 
		</BrowserRouter>
	);
}

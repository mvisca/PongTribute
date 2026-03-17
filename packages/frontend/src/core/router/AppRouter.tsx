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
import DeleteAccountPage from '../../features/profile/pages/DeleteAccountPage';
import Verify2FALoginPage from '../../features/auth/pages/Verify2FALoginPage';
import GamePage from '../../features/game/pages/GamePages';
import { LogedRedirect } from './LogedRedirect';

export function AppRouter() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	return (
		<BrowserRouter>
			<div className='flex flex-col h-screen'>
				<Navbar />
				<div className={`flex-1 overflow-y-auto ${isAuthenticated ? 'pt-20' : ''}`}>
					<Routes>
						{/* Root redirect */}
						<Route path="/" element={<RootRedirect />} />

						{/* Public routes */}
						<Route path='/welcome' element={
							<LogedRedirect>
								<PublicHomePage />
							</LogedRedirect>
						}/>
						<Route path="/login" element={
							<LogedRedirect>
								{<LoginPage />}
							</LogedRedirect>
						}/>
						<Route path="/register" element={
							<LogedRedirect>
								<RegisterPage /> 
							</LogedRedirect>
						}/>
						<Route path="/verify-2fa" element={						
							<LogedRedirect>
								<Verify2FALoginPage />
							</LogedRedirect>
						}/>
						<Route path="/forgot" element={
							<LogedRedirect>
								<ForgotPasswordPage />
							</LogedRedirect>
						}/>
						<Route path="/recover" element={
							<LogedRedirect>
								<RecoverPasswordPage />
							</LogedRedirect>
						}/>
						<Route path="/privacy" element={<PrivacyPage />}/>
						<Route path="/terms" element={<TermsPage />} />

						{/* Protected routes */}
						<Route path="/home" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>}/>
						<Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
						<Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
						<Route path="/profile/password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
						<Route path='/profile/delete' element={<ProtectedRoute><DeleteAccountPage /></ProtectedRoute>} />
						<Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
						<Route path='/history' element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
						<Route path='/2fa' element={<ProtectedRoute><TwoFactorPage /></ProtectedRoute>} />						<Route path='/history' element={<HistoryPage />} />
						<Route path='/temp' element={<ProtectedRoute><TempPage /></ProtectedRoute>} />
						<Route path="/game/:matchId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
						
						{/* 404 */}
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</div>
				<Footer />
			</div>
		</BrowserRouter>
	);
}
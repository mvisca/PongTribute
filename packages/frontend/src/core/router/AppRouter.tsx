import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';

import LoginPage    		from '../../features/auth/pages/LoginPage';
import RegisterPage 		from '../../features/auth/pages/RegisterPage';
import ForgotPasswordPage 	from '../../features/auth/pages/ForgotPasswordPage';
import RecoverPasswordPage 	from '../../features/auth/pages/RecoverPasswordPage';
import ProfilePage 			from '../../features/profile/pages/ProfilePage';
import EditProfilePage 		from '../../features/auth/pages/EditProfilePage';
import ChangePasswordPage	from '../../features/auth/pages/ChangePasswordPage';
import Navbar				from '../../shared/components/Navbar';

export function AppRouter() {
	return (
		<BrowserRouter>
			<Navbar />
			<Routes>
				{/* Rutas públicas */}
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/verify-2fa" element={<div>Verify 2FA Page</div>} />
				<Route path="/forgot" element={<ForgotPasswordPage />} />
				<Route path="/recover" element={<RecoverPasswordPage />} />

				{/* Rutas protegidas */}
				<Route path="/home" element={
					<ProtectedRoute>
						<div>Home Page</div>
					</ProtectedRoute>
				} />

				<Route path='/profile' element={
					<ProtectedRoute><ProfilePage /></ProtectedRoute>
				} />

				<Route path='/profile/edit' element={
					<ProtectedRoute>
						<EditProfilePage />
					</ProtectedRoute>
				} />

				<Route path='/profile/password' element={
					<ProtectedRoute>
						< ChangePasswordPage />
					</ProtectedRoute>
				} />

				{/* Raíz y 404 */}
				<Route path="/"  element={<Navigate to="/login" replace />} />
				<Route path="*"  element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import LoginPage    from '../../features/auth/pages/LoginPage';
import RegisterPage from '../../features/auth/pages/RegisterPage';

export function AppRouter() {
	return (
		<BrowserRouter>
			<Routes>
				{/* Rutas públicas */}
				<Route path="/login"    element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/forgot"   element={<div>Forgot Page</div>} />
				<Route path="/verify-2fa" element={<div>Verify 2FA Page</div>} />

				{/* Rutas protegidas */}
				<Route path="/home" element={
					<ProtectedRoute>
						<div>Home Page</div>
					</ProtectedRoute>
				} />

				{/* Raíz y 404 */}
				<Route path="/"  element={<Navigate to="/login" replace />} />
				<Route path="*"  element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
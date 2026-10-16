import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { Login } from './pages/Login';
import { ReceptionistPage } from './pages/ReceptionistPage';
import { DoctorPage } from './pages/DoctorPage';
import { BedManagementPage } from './pages/BedManagementPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PublicDisplayPage } from './pages/PublicDisplayPage';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'RECEPTIONIST') return <Navigate to="/receptionist" replace />;
  if (user.role === 'DOCTOR') return <Navigate to="/doctor" replace />;
  if (user.role === 'WARD_ADMIN') return <Navigate to="/beds" replace />;
  return <Navigate to="/analytics" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />
            <div className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/display" element={<PublicDisplayPage />} />

                {/* Role Protected Routes */}
                <Route
                  path="/receptionist"
                  element={
                    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}>
                      <ReceptionistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <DoctorPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/beds"
                  element={
                    <ProtectedRoute allowedRoles={['WARD_ADMIN', 'ADMIN', 'RECEPTIONIST']}>
                      <BedManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'WARD_ADMIN', 'RECEPTIONIST', 'DOCTOR']}>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="/" element={<HomeRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

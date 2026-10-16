import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hospital-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user.role !== 'ADMIN' && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
        <p className="text-sm text-slate-500 mt-1">
          Your role ({user.role}) does not have permission to view this section.
        </p>
      </div>
    );
  }

  return children;
}

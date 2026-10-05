import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
  requireOperate?: boolean;
  children?: React.ReactNode;
}

export function ProtectedRoute({
  requireAdmin = false,
  requireOperate = false,
  children,
}: ProtectedRouteProps) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="vh-100 d-flex align-items-center">
        <LoadingSpinner mensaje="Verificando sesión..." />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !currentUser.administrar) {
    return (
      <Navigate
        to={currentUser.operar ? '/checklist' : '/login'}
        replace
      />
    );
  }

if (
  requireOperate &&
  !currentUser.operar
) {
  return (
    <Navigate
      to={currentUser.administrar ? '/personal' : '/login'}
      replace
    />
  );
}

  return children ? <>{children}</> : <Outlet />;
}

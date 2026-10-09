import { permissions, homeFor } from '../libreria/permissions';
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

  const { canAdmin, canOperate } = permissions(currentUser);
  if (requireAdmin && !canAdmin) {
    return <Navigate to={homeFor(currentUser)} replace />;
  }

  if (requireOperate && !canOperate) {
    return <Navigate to={homeFor(currentUser)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

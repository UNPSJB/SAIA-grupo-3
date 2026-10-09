import React, { useCallback, useEffect, useState, useRef } from 'react';
import type { LoginData, AuthUser } from '../features/auth/types';
import {
  API_BASE_URL,
  fetchWithAuth,
  renovarSesion,
  setAccessToken,
  SESSION_EXPIRED_EVENT,
  clearSession,
} from '../shared/libreria/api';

import { AuthContext } from './authContextValue';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const generation = useRef(0);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async (userId: number): Promise<AuthUser> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/personal/${userId}`);

    if (!response.ok) {
      throw new Error('No se pudieron obtener los datos del usuario.');
    }

    const user = (await response.json()) as AuthUser;
    return user;
  }, []);

  useEffect(() => {
    const expire = () => {
      generation.current++;
      setIsLoading(false);
      setCurrentUser(null);
      setError('La sesión venció. Iniciá sesión nuevamente.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, []);

  // Al iniciar o recargar la app, recupera la sesión desde la cookie httpOnly.
  useEffect(() => {
    let cancelado = false;
    const currentGeneration = generation.current;

    const restaurarSesion = async () => {
      setIsLoading(true);

      try {
        const tokenData = await renovarSesion();

        if (!tokenData) {
          if (!cancelado && currentGeneration === generation.current) setCurrentUser(null);
          return;
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/personal/${tokenData.user_id}`);

        if (!response.ok) {
          throw new Error('No se pudieron recuperar los datos del usuario.');
        }

        const user = (await response.json()) as AuthUser;

        if (!cancelado && currentGeneration === generation.current) {
          setCurrentUser(user);
          setError(null);
        }
      } catch {
        if (currentGeneration === generation.current) setAccessToken(null);
        if (!cancelado && currentGeneration === generation.current) setCurrentUser(null);
      } finally {
        if (!cancelado && currentGeneration === generation.current) setIsLoading(false);
      }
    };

    void restaurarSesion();

    return () => {
      cancelado = true;
    };
  }, []);

  const login = useCallback(
    async (loginData: LoginData): Promise<boolean> => {
      const currentGeneration = ++generation.current;
      clearSession();
      setIsLoading(true);
      setError(null);

      try {
        const form = new URLSearchParams();
        form.append('username', loginData.username);
        form.append('password', loginData.password);

        const response = await fetchWithAuth(`${API_BASE_URL}/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Error al iniciar sesión.');
        }

        const tokenData = await response.json();
        if (currentGeneration !== generation.current) return false;
        setAccessToken(tokenData.access_token);

        // Si falla la carga del perfil, login devuelve false.
        const user = await fetchCurrentUser(tokenData.user_id);
        if (currentGeneration !== generation.current) return false;
        setCurrentUser(user);
        return true;
      } catch (err: unknown) {
        if (currentGeneration !== generation.current) return false;
        setAccessToken(null);
        setCurrentUser(null);
        setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
        return false;
      } finally {
        if (currentGeneration === generation.current) setIsLoading(false);
      }
    },
    [fetchCurrentUser],
  );

  const refreshCurrentUser = useCallback(async (): Promise<void> => {
    if (!currentUser) return;

    const currentGeneration = generation.current;
    const user = await fetchCurrentUser(currentUser.id);
    if (currentGeneration === generation.current) setCurrentUser(user);
  }, [currentUser, fetchCurrentUser]);

  const logout = useCallback(async (): Promise<void> => {
    generation.current++;
    clearSession();
    setCurrentUser(null);
    setIsLoading(false);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('No se pudo cerrar la sesión.');
    } catch {
      setError(
        'No se pudo cerrar la sesión en el servidor. Reintentá cuando se restablezca la conexión.',
      );
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        isLoading,
        error,
        login,
        logout,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

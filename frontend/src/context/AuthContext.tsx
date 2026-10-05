import React, {createContext,useCallback,useEffect,useState} from 'react';
import type {AuthContextType,LoginData,AuthUser} from '../features/auth/types';
import {API_BASE_URL,fetchWithAuth,renovarSesion,setAccessToken} from '../shared/libreria/api';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async (userId: number): Promise<AuthUser> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/personal/${userId}`);

    if (!response.ok) {
      throw new Error('No se pudieron obtener los datos del usuario.');
    }

    const user = (await response.json()) as AuthUser;
    setCurrentUser(user);
    setError(null);
    return user;
  }, []);

  // Al iniciar o recargar la app, recupera la sesión desde la cookie httpOnly.
  useEffect(() => {
    let cancelado = false;

    const restaurarSesion = async () => {
      setIsLoading(true);

      try {
        const tokenData = await renovarSesion();

        if (!tokenData) {
          if (!cancelado) setCurrentUser(null);
          return;
        }

        const response = await fetchWithAuth(
          `${API_BASE_URL}/personal/${tokenData.user_id}`,
        );

        if (!response.ok) {
          throw new Error('No se pudieron recuperar los datos del usuario.');
        }

        const user = (await response.json()) as AuthUser;

        if (!cancelado) {
          setCurrentUser(user);
          setError(null);
        }
      } catch {
        setAccessToken(null);
        if (!cancelado) setCurrentUser(null);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    void restaurarSesion();

    return () => {
      cancelado = true;
    };
  }, []);

  const login = useCallback(
    async (loginData: LoginData): Promise<boolean> => {
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
        setAccessToken(tokenData.access_token);

        // Si falla la carga del perfil, login devuelve false.
        await fetchCurrentUser(tokenData.user_id);
        return true;
      } catch (err: unknown) {
        setAccessToken(null);
        setCurrentUser(null);
        setError(
          err instanceof Error ? err.message : 'Error al iniciar sesión.',
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCurrentUser],
  );

  const refreshCurrentUser = useCallback(async (): Promise<void> => {
    if (!currentUser) return;

    const user = await fetchCurrentUser(currentUser.id);
    setCurrentUser(user);
  }, [currentUser, fetchCurrentUser]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
      setCurrentUser(null);
      setError(null);
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
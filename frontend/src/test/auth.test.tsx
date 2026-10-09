import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../context/authContextValue';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../shared/hooks/useAuth';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import {
  fetchWithAuth,
  clearSession,
  setAccessToken,
  renovarSesion,
  SESSION_EXPIRED_EVENT,
} from '../shared/libreria/api';
import type { AuthUser, AuthContextType } from '../features/auth/types';
const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(clearSession);
afterEach(() => vi.unstubAllGlobals());
describe('API y sesión', () => {
  it('una petición vieja no cierra una sesión nueva mientras renueva', async () => {
    let resolve!: (value: Response) => void;
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((finish) => {
            resolve = finish;
          }),
      );
    vi.stubGlobal('fetch', fetcher);
    const request = fetchWithAuth('/personal/1');
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    clearSession();
    setAccessToken('sesión nueva');
    resolve(json({ access_token: 'viejo', user_id: 1 }));
    await request;
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });
  it('renueva una vez y reintenta con el token nuevo', async () => {
    setAccessToken('viejo');
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ access_token: 'nuevo', user_id: 1 }))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal('fetch', fetcher);
    expect((await fetchWithAuth('/personal/1')).ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect((fetcher.mock.calls[2][1].headers as Headers).get('Authorization')).toBe('Bearer nuevo');
  });
  it('informa la sesión vencida cuando el reintento también falla', async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json({}, 401))
        .mockResolvedValueOnce(json({ access_token: 'nuevo', user_id: 1 }))
        .mockResolvedValueOnce(json({}, 401)),
    );
    expect((await fetchWithAuth('/personal/1')).status).toBe(401);
    expect(expired).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });
  it('un 403 conserva sesión y muestra un mensaje de permiso', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({}, 403));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchWithAuth('/sectores/')).rejects.toThrow('No tenés permiso');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('una renovación pendiente no restaura el token después del logout', async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((finish) => {
              resolve = finish;
            }),
        )
        .mockResolvedValue(json({})),
    );
    const refresh = renovarSesion();
    clearSession();
    resolve(json({ access_token: 'viejo', user_id: 1 }));
    expect(await refresh).toBeNull();
  });
});
const user = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Prueba',
  administrar: true,
  operar: false,
} as AuthUser;
function Harness() {
  const auth = useAuth();
  return (
    <>
      <output aria-label="session">
        {auth.isLoading ? 'cargando' : auth.currentUser?.nombre || 'sin sesión'}
      </output>
      <button onClick={() => void auth.logout()}>Salir</button>
    </>
  );
}
it('restaura el perfil una vez y cierra la sesión', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ access_token: 'token', user_id: 1 }))
    .mockResolvedValueOnce(json(user))
    .mockResolvedValue(json({}));
  vi.stubGlobal('fetch', fetcher);
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByLabelText('session').textContent).toBe('Ana'));
  await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
  expect(screen.getByLabelText('session').textContent).toBe('sin sesión');
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])('protege rutas administrativas %s/%s', async (administrar, operar) => {
  const context = {
    currentUser: { ...user, administrar, operar },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshCurrentUser: vi.fn(),
  } as AuthContextType;
  render(
    <AuthContext.Provider value={context}>
      <MemoryRouter initialEntries={['/sectores']}>
        <Routes>
          <Route
            path="/sectores"
            element={
              <ProtectedRoute requireAdmin>
                <p>Administración</p>
              </ProtectedRoute>
            }
          />
          <Route path="/checklist" element={<p>Operación</p>} />
          <Route path="/sin-permisos" element={<p>Sin permisos</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  expect(
    await screen.findByText(administrar ? 'Administración' : operar ? 'Operación' : 'Sin permisos'),
  ).toBeTruthy();
});

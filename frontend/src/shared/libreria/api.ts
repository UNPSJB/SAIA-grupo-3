export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);
export const SESSION_EXPIRED_EVENT = 'saia:session-expired';

interface TokenResponse {
  access_token: string;
  user_id: number;
}

let accessToken: string | null = null;
let sessionVersion = 0;
export function clearSession(): void {
  sessionVersion++;
  accessToken = null;
  refreshEnCurso = null;
}

let refreshEnCurso: Promise<TokenResponse | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function mensajeDeError(detail: unknown, porDefecto: string): string {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => String(item.msg).replace('Value error, ', '')).join('\n');
  }

  return porDefecto;
}

export async function renovarSesion(): Promise<TokenResponse | null> {
  if (!refreshEnCurso) {
    const version = sessionVersion;
    refreshEnCurso = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
          method: 'PUT',
          credentials: 'include',
        });

        if (!response.ok) {
          if (version === sessionVersion) setAccessToken(null);
          return null;
        }

        const data = (await response.json()) as TokenResponse;
        if (version !== sessionVersion) return null;
        setAccessToken(data.access_token);
        return data;
      } catch {
        if (version === sessionVersion) setAccessToken(null);
        return null;
      } finally {
        if (version === sessionVersion) refreshEnCurso = null;
      }
    })();
  }

  return refreshEnCurso;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const requestVersion = sessionVersion;
  const esEndpointDeToken = url.split('?')[0].replace(/\/$/, '').endsWith('/auth/token');

  const hacerPeticion = (token: string | null) => {
    const headers = new Headers(options.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.delete('Authorization');
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  let response = await hacerPeticion(accessToken);

  if (response.status === 401 && !esEndpointDeToken && requestVersion === sessionVersion) {
    const tokenData = await renovarSesion();

    if (tokenData && requestVersion === sessionVersion) {
      response = await hacerPeticion(tokenData.access_token);
    }
    if (response.status === 401 && requestVersion === sessionVersion) {
      setAccessToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }

  if (response.status === 403) throw new Error('No tenés permiso para realizar esta operación.');
  return response;
}

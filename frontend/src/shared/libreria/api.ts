export const API_BASE_URL = 'http://localhost:8000';

interface TokenResponse {
  access_token: string;
  user_id: number;
}

let accessToken: string | null = null;
let refreshEnCurso: Promise<TokenResponse | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function mensajeDeError(detail: unknown, porDefecto: string): string {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => String(item.msg).replace('Value error, ', ''))
      .join('\n');
  }

  return porDefecto;
}

export async function renovarSesion(): Promise<TokenResponse | null> {
  if (!refreshEnCurso) {
    refreshEnCurso = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
          method: 'PUT',
          credentials: 'include',
        });

        if (!response.ok) {
          setAccessToken(null);
          return null;
        }

        const data = (await response.json()) as TokenResponse;
        setAccessToken(data.access_token);
        return data;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshEnCurso = null;
      }
    })();
  }

  return refreshEnCurso;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
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

  if (response.status === 401 && !esEndpointDeToken) {
    const tokenData = await renovarSesion();

    if (tokenData) {
      response = await hacerPeticion(tokenData.access_token);
    } else if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }

  return response;
}
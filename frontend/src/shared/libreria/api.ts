export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);
export const SESSION_EXPIRED_EVENT = 'saia:session-expired';

export const MENSAJE_SIN_CONEXION =
  'No se pudo conectar con el servidor. Verificá tu conexión o intentá de nuevo en unos minutos.';

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

function traducirErrorValidacion(item: { type?: string; loc?: unknown[]; msg?: unknown }): string {
  const mensaje = String(item.msg ?? '');
  if (mensaje.startsWith('Value error, ')) return mensaje.replace('Value error, ', ''); // ya viene en español
  const campo = String(item.loc?.[item.loc.length - 1] ?? 'dato').replace(/_/g, ' ');
  switch (item.type) {
    case 'missing':
      return `Falta completar el campo "${campo}".`;
    case 'string_too_short':
      return `El campo "${campo}" no puede estar vacío.`;
    case 'string_too_long':
      return `El campo "${campo}" supera el largo permitido.`;
    case 'int_parsing':
    case 'float_parsing':
      return `El campo "${campo}" debe ser un número.`;
    case 'enum':
      return `El valor elegido en "${campo}" no es válido.`;
    default:
      return mensaje;
  }
}

export function mensajeDeError(detail: unknown, porDefecto: string): string {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail.map(traducirErrorValidacion).join('\n');
  }

  return porDefecto;
}

export async function mensajeDeRespuesta(res: Response, porDefecto: string): Promise<string> {
  const errorData = await res.json().catch(() => ({}));
  return mensajeDeError(errorData.detail, porDefecto);
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

  const hacerPeticion = async (token: string | null) => {
    const headers = new Headers(options.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.delete('Authorization');
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      return await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch {
      throw new Error(MENSAJE_SIN_CONEXION);
    }
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

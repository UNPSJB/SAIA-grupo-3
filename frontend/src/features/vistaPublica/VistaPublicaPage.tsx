import { useEffect, useState } from 'react';
import { Alert, Container } from 'react-bootstrap';

import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { VistaPublicaContenido } from './VistaPublicaContenido';

import { urlEventosPublicos, type VistaPublicaDatos } from './vistaPublicaApi';

interface EstadoVista {
  datos: VistaPublicaDatos | null;
  error: string | null;
}

export function VistaPublicaPage() {
  const [estado, setEstado] = useState<EstadoVista | null>(null);

  useEffect(() => {
    let activo = true;

    // No usa fetchWithAuth ni exige una sesión de usuario.
    const conexion = new EventSource(urlEventosPublicos());

    conexion.addEventListener('vista', (evento) => {
      if (!activo) return;

      try {
        const datos = JSON.parse((evento as MessageEvent<string>).data) as VistaPublicaDatos;

        setEstado({ datos, error: null });
      } catch {
        setEstado({
          datos: null,
          error: 'No se pudieron interpretar los indicadores.',
        });
      }
    });

    conexion.addEventListener('no-disponible', () => {
      if (!activo) return;

      setEstado({
        datos: null,
        error: 'La vista pública no está disponible.',
      });

      conexion.close();
    });

    conexion.onerror = () => {
      if (!activo) return;

      // No deja visibles valores anteriores mientras no se puede
      // verificar si la publicación continúa disponible.
      setEstado({
        datos: null,
        error:
          'La vista pública no está disponible o no se pudo conectar. ' +
          'Se volverá a intentar automáticamente.',
      });
    };

    return () => {
      activo = false;
      conexion.close();
    };
  }, []);

  return (
    <div className="pagina-vista-publica">
      <header className="vp-navegacion">
        <div className="vp-navegacion-interior">
          <a href="/saia-publica" className="vp-marca" aria-label="SAIA · Vista pública">
            <span className="vp-marca-icono">
              {/* Lucide wheat: https://lucide.dev/icons/wheat (ISC).
                  Copyright (c) 2026 Lucide Icons and Contributors
                  Permission to use, copy, modify, and/or distribute this software for any
                  purpose with or without fee is hereby granted, provided that the above
                  copyright notice and this permission notice appear in all copies.
                  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
                  WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
                  MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
                  ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
                  WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
                  ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
                  OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="-4 -4 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                focusable="false"
                aria-hidden="true"
              >
                <path d="M2 22 16 8" />
                <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
                <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
                <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
                <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
                <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
              </svg>
            </span>
            <span>SAIA</span>
          </a>
          <span className="vp-navegacion-etiqueta">Vista pública</span>
        </div>
      </header>

      {estado?.datos && !estado.error ? (
        <VistaPublicaContenido datos={estado.datos} />
      ) : (
        <Container className="py-4" style={{ maxWidth: 1200 }}>
          {!estado ? (
            <LoadingSpinner mensaje="Consultando indicadores..." />
          ) : estado.error ? (
            <Alert variant="secondary">{estado.error}</Alert>
          ) : null}
        </Container>
      )}
    </div>
  );
}

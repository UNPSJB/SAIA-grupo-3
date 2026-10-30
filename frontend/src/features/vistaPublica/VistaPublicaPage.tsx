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
              <svg
                viewBox="0 0 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M16 29V8" />
                <ellipse cx="16" cy="5" rx="2.4" ry="3.5" />
                <ellipse cx="12" cy="11" rx="2.4" ry="4" transform="rotate(-40 12 11)" />
                <ellipse cx="20" cy="11" rx="2.4" ry="4" transform="rotate(40 20 11)" />
                <ellipse cx="12" cy="17" rx="2.4" ry="4" transform="rotate(-40 12 17)" />
                <ellipse cx="20" cy="17" rx="2.4" ry="4" transform="rotate(40 20 17)" />
                <ellipse cx="12" cy="23" rx="2.4" ry="4" transform="rotate(-40 12 23)" />
                <ellipse cx="20" cy="23" rx="2.4" ry="4" transform="rotate(40 20 23)" />
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

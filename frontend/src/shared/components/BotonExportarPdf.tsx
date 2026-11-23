import { useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import {
  nombreArchivoListado,
  obtenerDatosExportacion,
  type ParametrosExportacion,
} from '../libreria/exportacion';
import {
  imprimirDocumento,
  ReporteImpresion,
  type MetadatoReporte,
} from './ReporteImpresion';

export interface ColumnaPdf<T> {
  titulo: string;
  valor: (fila: T) => string;
  numerica?: boolean;
}

interface BotonExportarPdfProps<T> {
  modulo: string;
  titulo: string;
  endpoint: string;
  parametros?: ParametrosExportacion;
  columnas: ColumnaPdf<T>[];
  subtitulo?: string;
  metadatos?: MetadatoReporte[];
  size?: 'sm' | 'lg';
}

export function BotonExportarPdf<T>({
  modulo,
  titulo,
  endpoint,
  parametros = {},
  columnas,
  subtitulo,
  metadatos = [],
  size,
}: BotonExportarPdfProps<T>) {
  const { currentUser } = useAuth();
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<{ variante: 'danger' | 'warning'; texto: string } | null>(
    null,
  );
  const [datosPdf, setDatosPdf] = useState<{ filas: T[]; fechaEmision: string } | null>(null);
  const enCurso = useRef(false);

  if (!currentUser?.administrar) {
    return null;
  }

  const handleExportar = async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setExportando(true);
    setAviso(null);

    try {
      const filas = await obtenerDatosExportacion<T>(endpoint, parametros);
      if (filas.length === 0) {
        setAviso({
          variante: 'warning',
          texto: 'No hay registros para exportar con los filtros actuales.',
        });
        return;
      }

      const fechaEmision = new Date().toISOString();
      flushSync(() => {
        setDatosPdf({ filas, fechaEmision });
      });

      imprimirDocumento('imprimiendo-listado', nombreArchivoListado(modulo));
    } catch (err: unknown) {
      setAviso({
        variante: 'danger',
        texto: err instanceof Error ? err.message : 'No se pudo exportar el listado a PDF.',
      });
    } finally {
      enCurso.current = false;
      setExportando(false);
    }
  };

  return (
    <>
      <Button
        variant="outline-primary"
        size={size}
        disabled={exportando}
        onClick={() => void handleExportar()}
        className="d-inline-flex align-items-center gap-1 shadow-sm text-nowrap"
      >
        {exportando ? (
          <>
            <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
            <span>Exportando...</span>
          </>
        ) : (
          <>
            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
            <span>Exportar PDF</span>
          </>
        )}
      </Button>

      {aviso &&
        createPortal(
          <div
            className="position-fixed top-0 end-0 p-3"
            style={{ zIndex: 1080, maxWidth: '420px', marginTop: '64px' }}
          >
            <Alert
              variant={aviso.variante}
              dismissible
              onClose={() => setAviso(null)}
              className="shadow mb-0"
              role="alert"
            >
              {aviso.texto}
            </Alert>
          </div>,
          document.body,
        )}

      {datosPdf &&
        createPortal(
          <div className="rep-portal rep-portal-listado">
            <ReporteImpresion
              titulo={titulo}
              subtitulo={subtitulo}
              fechaEmision={datosPdf.fechaEmision}
              usuario={currentUser}
              metadatos={[
                { etiqueta: 'Total de registros', valor: String(datosPdf.filas.length) },
                ...metadatos,
              ]}
            >
              <table className="rep-tabla">
                <thead>
                  <tr>
                    {columnas.map((col) => (
                      <th key={col.titulo} className={col.numerica ? 'rep-num' : undefined}>
                        {col.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datosPdf.filas.map((fila, idx) => (
                    <tr key={idx}>
                      {columnas.map((col) => (
                        <td key={col.titulo} className={col.numerica ? 'rep-num' : undefined}>
                          {col.valor(fila)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReporteImpresion>
          </div>,
          document.body,
        )}
    </>
  );
}
import type { ReactNode } from 'react';
import { formatearFechaHora } from '../libreria/fechas';
import './ReporteImpresion.css';

export interface MetadatoReporte {
  etiqueta: string;
  valor: string;
}

export interface UsuarioReporte {
  nombre: string;
  apellido: string;
}

interface ReporteImpresionProps {
  titulo: string;
  subtitulo?: string | null;
  establecimiento?: string | null;
  fechaEmision?: string | Date | null;
  usuario?: UsuarioReporte | null;
  metadatos?: MetadatoReporte[];
  leyendaSuperior?: string | null;
  pieNota?: string | null;
  saltoDePagina?: boolean;
  children: ReactNode;
}

export function imprimirDocumento(claseBody: string, tituloDocumento?: string): void {
  const tituloAnterior = document.title;
  if (tituloDocumento) {
    document.title = tituloDocumento;
  }
  const quitar = () => {
    document.body.classList.remove(claseBody);
    if (tituloDocumento) {
      document.title = tituloAnterior;
    }
    window.removeEventListener('afterprint', quitar);
  };
  document.body.classList.add(claseBody);
  window.addEventListener('afterprint', quitar);
  window.print();
}

function textoEmision(fechaEmision?: string | Date | null): string {
  if (!fechaEmision) return formatearFechaHora(new Date().toISOString());
  if (fechaEmision instanceof Date) return formatearFechaHora(fechaEmision.toISOString());
  return formatearFechaHora(fechaEmision);
}

export function ReporteImpresion({
  titulo,
  subtitulo,
  establecimiento,
  fechaEmision,
  usuario,
  metadatos = [],
  leyendaSuperior,
  pieNota,
  saltoDePagina = false,
  children,
}: ReporteImpresionProps) {
  const nombreUsuario = usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : 'No informado';

  return (
    <table className={`rep-hoja ${saltoDePagina ? 'rep-salto-pagina' : ''}`}>
      {leyendaSuperior && (
        <thead>
          <tr>
            <td>
              <div className="rep-leyenda-pagina">{leyendaSuperior}</div>
            </td>
          </tr>
        </thead>
      )}
      <tbody>
        <tr>
          <td>
            <div className="rep-documento">
              <header className="rep-membrete">
                <div className="rep-membrete-superior">
                  <span className="rep-sistema">
                    SAIA · Sistema de Apoyo a la Inocuidad Alimentaria
                  </span>
                  {establecimiento && (
                    <span className="rep-establecimiento">{establecimiento}</span>
                  )}
                </div>
                <h1 className="rep-titulo">{titulo}</h1>
                {subtitulo && <p className="rep-subtitulo">{subtitulo}</p>}
                <dl className="rep-metadatos">
                  <div>
                    <dt>Emisión</dt>
                    <dd>{textoEmision(fechaEmision)}</dd>
                  </div>
                  <div>
                    <dt>Generado por</dt>
                    <dd>{nombreUsuario}</dd>
                  </div>
                  {metadatos.map((item) => (
                    <div key={item.etiqueta}>
                      <dt>{item.etiqueta}</dt>
                      <dd>{item.valor}</dd>
                    </div>
                  ))}
                </dl>
              </header>

              {children}

              {pieNota && <div className="rep-pie-nota">{pieNota}</div>}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
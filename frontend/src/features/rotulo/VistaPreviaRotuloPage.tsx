import { useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Alert, Badge, Button, Card, Container, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { DocumentoExportacion } from './DocumentoExportacion';
import { EtiquetaRotulo } from './EtiquetaRotulo';
import { exportarRotulo, getExportacion, getVistaPrevia, listarExportaciones } from './rotuloApi';
import type { Exportacion, VistaPrevia } from './types';
import './VistaPreviaRotulo.css';

const CLASE_IMPRESION = 'imprimiendo-rotulo';
const CLASE_EXPORTACION = 'imprimiendo-exportacion';

function imprimir(clase: string) {
  const quitar = () => {
    document.body.classList.remove(clase);
    window.removeEventListener('afterprint', quitar);
  };
  document.body.classList.add(clase);
  window.addEventListener('afterprint', quitar);
  window.print();
}

function Advertencias({ vista, enlaces }: { vista: VistaPrevia; enlaces: boolean }) {
  if (vista.advertencias.length === 0) return null;
  const productoId = vista.borrador.producto.id;
  return (
    <Alert variant="danger" className="vp-advertencias border-2 border-danger">
      <div className="fw-bold mb-1">
        <i className="bi bi-exclamation-octagon-fill me-2" aria-hidden="true" />
        El rótulo no está listo para revisión
      </div>
      <ul className="mb-2 ps-3">
        {vista.advertencias.map((advertencia) => (
          <li key={advertencia}>{advertencia}</li>
        ))}
      </ul>
      {vista.faltantes.length > 0 && (
        <div className="d-flex flex-wrap gap-1 small">
          <span className="me-1">Completar:</span>
          {vista.faltantes.map((faltante) =>
            enlaces ? (
              <Link
                key={faltante.campo}
                to={`/rotulado/${productoId}#campo-${faltante.campo}`}
                className="btn btn-sm btn-outline-danger py-0"
              >
                {faltante.etiqueta}
              </Link>
            ) : (
              <span key={faltante.campo} className="border border-danger rounded px-1">
                {faltante.etiqueta}
              </span>
            ),
          )}
        </div>
      )}
    </Alert>
  );
}

export function VistaPreviaRotuloPage() {
  const { productoId } = useParams();
  const id = Number(productoId);
  const navigate = useNavigate();
  const { datos: vista, error, cargando, recargar } = useConsulta(() => getVistaPrevia(id), [id]);
  const historial = useConsulta(() => listarExportaciones(id), [id]);
  const [exportacion, setExportacion] = useState<Exportacion | null>(null);
  const [exportando, setExportando] = useState(false);
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState<number | null>(null);

  const imprimirExportacion = (datos: Exportacion) => {
    if (!datos.vista_previa.leyenda_borrador?.trim()) {
      setErrorExportacion('La exportación no trae la leyenda de BORRADOR: no se puede imprimir.');
      return;
    }
    flushSync(() => setExportacion(datos));
    imprimir(CLASE_EXPORTACION);
  };

  const exportar = async () => {
    setExportando(true);
    setErrorExportacion(null);
    setRegistrada(null);
    try {
      const nueva = await exportarRotulo(id);
      setRegistrada(nueva.numero);
      historial.recargar();
      imprimirExportacion(nueva);
    } catch (err: unknown) {
      setErrorExportacion(err instanceof Error ? err.message : 'No se pudo exportar el rótulo.');
    } finally {
      setExportando(false);
    }
  };

  const reimprimir = async (exportacionId: number) => {
    setErrorExportacion(null);
    try {
      imprimirExportacion(await getExportacion(exportacionId));
    } catch (err: unknown) {
      setErrorExportacion(err instanceof Error ? err.message : 'No se pudo abrir la exportación.');
    }
  };

  if (error) {
    return (
      <Container className="py-2">
        <ErrorAlert mensaje={error} />
        <Button variant="outline-secondary" onClick={() => navigate(`/rotulado/${id}`)}>
          Volver al borrador
        </Button>
      </Container>
    );
  }
  if (cargando || !vista) return <LoadingSpinner mensaje="Armando la vista previa..." />;

  const puedeImprimir = Boolean(vista.leyenda_borrador?.trim());

  return (
    <Container className="py-2 vp-pagina">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center border-bottom pb-2 mb-3">
        <div>
          <h2 className="text-secondary mb-0">Vista previa · {vista.borrador.producto.nombre}</h2>
          <div className="small text-body-secondary">
            Armada {formatearFechaHora(vista.generada_en)} con los datos guardados del borrador
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" onClick={() => navigate(`/rotulado/${id}`)}>
            Volver al borrador
          </Button>
          <Button variant="outline-secondary" onClick={recargar}>
            Actualizar
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => imprimir(CLASE_IMPRESION)}
            disabled={!puedeImprimir}
          >
            <i className="bi bi-printer me-1" aria-hidden="true" />
            Imprimir rótulo
          </Button>
          <Button onClick={() => void exportar()} disabled={!puedeImprimir || exportando}>
            <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      <div className="vp-leyenda-fija" role="note">
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        {vista.leyenda_borrador}
      </div>

      {errorExportacion && <ErrorAlert mensaje={errorExportacion} />}
      {registrada !== null && (
        <Alert variant="info" className="py-2" dismissible onClose={() => setRegistrada(null)}>
          Exportación N° {registrada} registrada. En el diálogo de impresión elegí «Guardar como
          PDF»: el documento lleva el rótulo y el anexo con el respaldo de los cálculos en hojas
          separadas.
        </Alert>
      )}

      <Advertencias vista={vista} enlaces />
      {vista.lista_para_revision && (
        <Alert variant="success" className="py-2">
          Tiene todos los datos obligatorios y la tabla nutricional completa: está listo para
          revisión profesional.
        </Alert>
      )}

      <EtiquetaRotulo vista={vista} />

      <Card className="shadow-sm border-0 mt-4">
        <Card.Header as="h6" className="bg-body-tertiary text-secondary py-3 mb-0">
          Historial de exportaciones
        </Card.Header>
        <Card.Body className="p-0">
          {historial.error && <ErrorAlert mensaje={historial.error} />}
          {historial.datos && historial.datos.length === 0 && (
            <p className="text-body-secondary small p-3 mb-0">Todavía no se exportó este rótulo.</p>
          )}
          {historial.datos && historial.datos.length > 0 && (
            <Table responsive size="sm" className="mb-0 align-middle small">
              <thead>
                <tr className="text-body-secondary">
                  <th className="ps-3">N°</th>
                  <th>Fecha</th>
                  <th>Persona</th>
                  <th>Receta</th>
                  <th>Parámetros</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {historial.datos.map((fila) => (
                  <tr key={fila.id}>
                    <td className="ps-3">{fila.numero}</td>
                    <td className="text-nowrap">{formatearFechaHora(fila.generado_en)}</td>
                    <td className="text-nowrap">
                      {fila.generado_por.nombre} {fila.generado_por.apellido}
                    </td>
                    <td>v{fila.version_receta_numero}</td>
                    <td>
                      {fila.conjunto_parametros_numero
                        ? `v${fila.conjunto_parametros_numero}`
                        : '—'}
                    </td>
                    <td>
                      {fila.lista_para_revision ? (
                        <Badge bg="success" className="fw-normal">
                          Lista para revisión
                        </Badge>
                      ) : (
                        <Badge bg="warning" text="dark" className="fw-normal">
                          {fila.faltantes === 1
                            ? '1 dato faltante'
                            : `${fila.faltantes} datos faltantes`}
                        </Badge>
                      )}
                    </td>
                    <td className="text-end pe-3">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="text-nowrap"
                        onClick={() => void reimprimir(fila.id)}
                      >
                        Volver a imprimir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {puedeImprimir &&
        createPortal(
          <div className="vp-impresion">
            <div className="vp-impresion-leyenda">{vista.leyenda_borrador}</div>
            <h4 className="mb-1">Rótulo · {vista.borrador.producto.nombre}</h4>
            <div className="small mb-3">
              Vista previa del {formatearFechaHora(vista.generada_en)}
            </div>
            <Advertencias vista={vista} enlaces={false} />
            <EtiquetaRotulo vista={vista} />
          </div>,
          document.body,
        )}
      {exportacion &&
        createPortal(
          <div className="exp-impresion">
            <DocumentoExportacion exportacion={exportacion} />
          </div>,
          document.body,
        )}
    </Container>
  );
}

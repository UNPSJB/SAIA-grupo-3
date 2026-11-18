import { createPortal } from 'react-dom';
import { Alert, Button, Container } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { EtiquetaRotulo } from './EtiquetaRotulo';
import { getVistaPrevia } from './rotuloApi';
import type { VistaPrevia } from './types';
import './VistaPreviaRotulo.css';

const CLASE_IMPRESION = 'imprimiendo-rotulo';

function imprimir() {
  const quitar = () => {
    document.body.classList.remove(CLASE_IMPRESION);
    window.removeEventListener('afterprint', quitar);
  };
  document.body.classList.add(CLASE_IMPRESION);
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
          <Button onClick={imprimir} disabled={!puedeImprimir}>
            <i className="bi bi-printer me-1" aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="vp-leyenda-fija" role="note">
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        {vista.leyenda_borrador}
      </div>

      <Advertencias vista={vista} enlaces />
      {vista.lista_para_revision && (
        <Alert variant="success" className="py-2">
          Tiene todos los datos obligatorios y la tabla nutricional completa: está listo para
          revisión profesional.
        </Alert>
      )}

      <EtiquetaRotulo vista={vista} />

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
    </Container>
  );
}

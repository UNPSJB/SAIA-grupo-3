import { Alert, Badge, Button, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { NUTRIENTES_TODOS, type FaltanteNutricional, type Nutriente } from './types';

const ETIQUETAS = Object.fromEntries(
  NUTRIENTES_TODOS.map((n) => [n.nutriente, n.etiqueta.toLowerCase()]),
);

const lista = (nutrientes: Nutriente[]) => nutrientes.map((n) => ETIQUETAS[n]).join(', ');

interface Props {
  faltantes: FaltanteNutricional[];
  onCompletar: (insumo: NonNullable<FaltanteNutricional['insumo']>) => void;
  onVerComposicion?: () => void;
  rutaNuevaVersion?: string;
}

export function AvisoFaltantes({
  faltantes,
  onCompletar,
  onVerComposicion,
  rutaNuevaVersion,
}: Props) {
  if (faltantes.length === 0) return null;
  const insumos = faltantes.filter((faltante) => faltante.tipo === 'insumo').length;

  return (
    <Alert variant="warning" className="p-0 overflow-hidden" role="alert">
      <div className="px-3 pt-3 pb-2">
        <div className="fw-semibold">
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
          Tabla incompleta: no la uses en un rótulo hasta completar estos datos.
        </div>
        <div className="small">
          {insumos > 0 &&
            `${insumos === 1 ? '1 insumo tiene' : `${insumos} insumos tienen`} datos faltantes o sin fuente. `}
          Los valores que dependen de un dato faltante se muestran como «—».
        </div>
      </div>
      <ListGroup variant="flush">
        {faltantes.map((faltante, indice) => (
          <ListGroup.Item
            key={`${faltante.tipo}-${faltante.insumo?.id ?? indice}`}
            className="bg-transparent d-flex flex-wrap gap-2 align-items-center justify-content-between"
          >
            <div className="me-auto">
              {faltante.insumo ? (
                <>
                  <span className="fw-semibold">{faltante.insumo.nombre}</span>
                  {faltante.insumo.tipo === 'aditivo' && (
                    <Badge bg="light" text="dark" className="ms-2 border fw-normal">
                      aditivo
                    </Badge>
                  )}
                  {faltante.nutrientes.length > 0 && (
                    <div className="small">Falta: {lista(faltante.nutrientes)}</div>
                  )}
                  {faltante.sin_fuente.length > 0 && (
                    <div className="small">Sin fuente registrada: {lista(faltante.sin_fuente)}</div>
                  )}
                </>
              ) : (
                <span className="small">{faltante.mensaje}</span>
              )}
            </div>
            {faltante.insumo && (
              <Button size="sm" variant="warning" onClick={() => onCompletar(faltante.insumo!)}>
                Completar
              </Button>
            )}
            {faltante.tipo === 'composicion' && onVerComposicion && (
              <Button size="sm" variant="outline-dark" onClick={onVerComposicion}>
                Ver composición
              </Button>
            )}
            {(faltante.tipo === 'rendimiento' || faltante.tipo === 'porcion') &&
              rutaNuevaVersion && (
                <Link to={rutaNuevaVersion} className="btn btn-sm btn-outline-dark">
                  Modificar la receta
                </Link>
              )}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Alert>
  );
}

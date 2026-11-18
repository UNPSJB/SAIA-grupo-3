import { Alert, Badge, Button, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { listarAlergenos } from '../alergenos';
import type { Alergeno } from '../alergenos';
import type { CondicionConservacion, DeclaracionAlergenos, UnidadVidaUtil } from './types';

export interface ConservacionFormulario {
  puede_contener_ids: number[];
  conservacion_condicion: CondicionConservacion | null;
  conservacion_temp_min: string;
  conservacion_temp_max: string;
  conservacion_duracion_cantidad: string;
  conservacion_duracion_unidad: UnidadVidaUtil;
  conservacion_abierto: string;
}

const CONDICIONES: Record<CondicionConservacion, string> = {
  ambiente: 'Ambiente (lugar fresco y seco)',
  refrigerado: 'Refrigerado',
  congelado: 'Congelado',
};

function unir(nombres: string[]) {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

function Causas({ causas }: { causas: { id: number; nombre: string }[] }) {
  return (
    <span className="small text-body-secondary">
      por {unir(causas.map((causa) => causa.nombre))}
    </span>
  );
}

export function SeccionAlergenos({
  declaracion,
  leyendaConservacion,
  recetaId,
  valores,
  hayCambios,
  confirmando,
  onCambiar,
  onConfirmar,
}: {
  declaracion: DeclaracionAlergenos;
  leyendaConservacion: string | null;
  recetaId: number | null;
  valores: ConservacionFormulario;
  hayCambios: boolean;
  confirmando: boolean;
  onCambiar: (cambios: Partial<ConservacionFormulario>) => void;
  onConfirmar: () => void;
}) {
  const alergenos = useConsulta(() => listarAlergenos(), []);
  const declarados = new Set(declaracion.contiene.map((a) => a.id));
  const elegibles: (Alergeno | DeclaracionAlergenos['puede_contener'][number])[] = [
    ...(alergenos.datos ?? []).filter((a) => !declarados.has(a.id)),
    ...declaracion.puede_contener.filter((a) => !alergenos.datos?.some((b) => b.id === a.id)),
  ];
  const textos = new Map((alergenos.datos ?? []).map((a) => [a.id, a.texto_declaracion]));
  const elegidos = elegibles.filter((a) => valores.puede_contener_ids.includes(a.id));
  const textoPuede = elegidos.length
    ? `PUEDE CONTENER ${unir(elegidos.map((a) => textos.get(a.id) ?? a.nombre))}.`.toUpperCase()
    : null;
  const confirmada = declaracion.estado === 'confirmada';
  const sinReceta = declaracion.version_receta_numero === null;

  const alternar = (alergenoId: number, marcado: boolean) =>
    onCambiar({
      puede_contener_ids: marcado
        ? [...valores.puede_contener_ids, alergenoId]
        : valores.puede_contener_ids.filter((id) => id !== alergenoId),
    });

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        {confirmada ? (
          <Badge bg="success" className="fw-normal text-wrap text-start">
            <i className="bi bi-check2-circle me-1" aria-hidden="true" />
            Confirmada por {declaracion.confirmado_por?.nombre}{' '}
            {declaracion.confirmado_por?.apellido}
            {declaracion.confirmado_en && ` el ${formatearFechaHora(declaracion.confirmado_en)}`}
          </Badge>
        ) : (
          <Badge bg="warning" text="dark" className="fw-normal">
            <i className="bi bi-magic me-1" aria-hidden="true" />
            Sugerida por el sistema
          </Badge>
        )}
        {declaracion.version_receta_numero !== null && (
          <span className="small text-body-secondary">
            desde la receta v{declaracion.version_receta_numero}
          </span>
        )}
        {recetaId && (
          <Link to={`/recetas/${recetaId}`} className="small ms-auto">
            Ver receta
          </Link>
        )}
      </div>

      {declaracion.aviso && (
        <Alert variant="warning" className="py-2">
          <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
          {declaracion.aviso}
        </Alert>
      )}
      {declaracion.advertencias.map((advertencia) => (
        <Alert key={advertencia} variant="secondary" className="py-2 small">
          {advertencia}
        </Alert>
      ))}
      {sinReceta && (
        <Alert variant="warning" className="py-2">
          El producto no tiene receta vigente: no hay ingredientes de los que proponer alérgenos.
        </Alert>
      )}

      <Row className="g-3">
        <Col md={6}>
          <div className="fw-semibold mb-1">Contiene</div>
          {declaracion.contiene.length === 0 ? (
            <div className="small text-body-secondary">
              Ningún ingrediente de la receta tiene alérgenos marcados.
            </div>
          ) : (
            <ul className="list-unstyled mb-2">
              {declaracion.contiene.map((alergeno) => (
                <li key={alergeno.id} className="mb-1">
                  <Badge bg="danger" className="me-2">
                    {alergeno.nombre}
                  </Badge>
                  <Causas causas={alergeno.causas} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2">
            {declaracion.contiene_gluten ? (
              <>
                <Badge bg="warning" text="dark" className="me-2">
                  Contiene gluten (TACC)
                </Badge>
                <Causas causas={declaracion.causas_gluten} />
              </>
            ) : (
              <span className="small text-body-secondary">
                Ningún ingrediente marcado con gluten. Para rotular «Sin TACC» hace falta la
                certificación de libre de gluten.
              </span>
            )}
          </div>
        </Col>
        <Col md={6}>
          <div className="fw-semibold mb-1">Así se verá debajo de los ingredientes</div>
          <div className="border rounded p-2 bg-body-tertiary small" style={{ minHeight: '3rem' }}>
            {declaracion.texto_contiene || textoPuede ? (
              <>
                {declaracion.texto_contiene && (
                  <div className="fw-bold">{declaracion.texto_contiene}</div>
                )}
                {textoPuede && <div className="fw-bold">{textoPuede}</div>}
              </>
            ) : (
              <span className="text-body-secondary">Sin declaración de alérgenos.</span>
            )}
          </div>
          <Form.Text>
            En mayúscula y negrita, agrupado inmediatamente después de la lista de ingredientes.
          </Form.Text>
        </Col>
      </Row>

      <fieldset className="mt-3" id="campo-puede_contener">
        <legend className="fs-6 fw-semibold mb-1">Puede contener (contaminación cruzada)</legend>
        <div className="small text-body-secondary mb-2">
          Marcalo solo si hay un riesgo real e inevitable por compartir equipos o el lugar de
          elaboración, evaluado en tus procedimientos.
        </div>
        {alergenos.error && <ErrorAlert mensaje={alergenos.error} />}
        <div>
          {elegibles.map((alergeno) => (
            <Form.Check
              key={alergeno.id}
              inline
              type="checkbox"
              id={`puede-contener-${alergeno.id}`}
              label={alergeno.nombre}
              checked={valores.puede_contener_ids.includes(alergeno.id)}
              onChange={(e) => alternar(alergeno.id, e.target.checked)}
            />
          ))}
        </div>
      </fieldset>

      <hr />

      <div className="fw-semibold mb-2">Condiciones de conservación</div>
      <Row className="g-2 align-items-end">
        <Col sm={6} md={4}>
          <Form.Group controlId="campo-conservacion_condicion">
            <Form.Label>Condición</Form.Label>
            <Form.Select
              value={valores.conservacion_condicion ?? ''}
              onChange={(e) =>
                onCambiar({
                  conservacion_condicion: (e.target.value || null) as CondicionConservacion | null,
                })
              }
            >
              <option value="">Seleccioná...</option>
              {Object.entries(CONDICIONES).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={6} md={2}>
          <Form.Label htmlFor="campo-conservacion_temp_min">Temp. mínima</Form.Label>
          <InputGroup>
            <Form.Control
              id="campo-conservacion_temp_min"
              inputMode="decimal"
              value={valores.conservacion_temp_min}
              disabled={!valores.conservacion_condicion}
              onChange={(e) => onCambiar({ conservacion_temp_min: e.target.value })}
            />
            <InputGroup.Text>°C</InputGroup.Text>
          </InputGroup>
        </Col>
        <Col xs={6} md={2}>
          <Form.Label htmlFor="campo-conservacion_temp_max">Temp. máxima</Form.Label>
          <InputGroup>
            <Form.Control
              id="campo-conservacion_temp_max"
              inputMode="decimal"
              value={valores.conservacion_temp_max}
              disabled={!valores.conservacion_condicion}
              onChange={(e) => onCambiar({ conservacion_temp_max: e.target.value })}
            />
            <InputGroup.Text>°C</InputGroup.Text>
          </InputGroup>
        </Col>
        <Col sm={6} md={4}>
          <Form.Label htmlFor="campo-conservacion_duracion_cantidad">
            Duración en esas condiciones
          </Form.Label>
          <InputGroup>
            <Form.Control
              id="campo-conservacion_duracion_cantidad"
              type="number"
              min={1}
              value={valores.conservacion_duracion_cantidad}
              disabled={!valores.conservacion_condicion}
              onChange={(e) => onCambiar({ conservacion_duracion_cantidad: e.target.value })}
            />
            <Form.Select
              aria-label="Unidad de la duración"
              value={valores.conservacion_duracion_unidad}
              disabled={!valores.conservacion_condicion}
              onChange={(e) =>
                onCambiar({ conservacion_duracion_unidad: e.target.value as UnidadVidaUtil })
              }
            >
              <option value="dias">días</option>
              <option value="meses">meses</option>
            </Form.Select>
          </InputGroup>
        </Col>
        <Col xs={12}>
          <Form.Group controlId="campo-conservacion_abierto">
            <Form.Label>Una vez abierto (opcional)</Form.Label>
            <Form.Control
              maxLength={300}
              placeholder="Ej.: Mantener refrigerado y consumir dentro de los 5 días"
              value={valores.conservacion_abierto}
              onChange={(e) => onCambiar({ conservacion_abierto: e.target.value })}
            />
          </Form.Group>
        </Col>
      </Row>
      {leyendaConservacion && (
        <div className="small mt-2">
          <span className="text-body-secondary">En el rótulo: </span>
          {leyendaConservacion}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end mt-3 pt-3 border-top">
        {hayCambios && !confirmada && (
          <span className="small text-body-secondary">
            Se guardan los cambios antes de confirmar.
          </span>
        )}
        {confirmada && hayCambios && (
          <span className="small text-warning-emphasis">
            Si cambiás «puede contener», la declaración vuelve a quedar sugerida.
          </span>
        )}
        <Button
          variant={confirmada ? 'outline-success' : 'success'}
          disabled={confirmando || sinReceta || (confirmada && !hayCambios)}
          onClick={onConfirmar}
        >
          <i className="bi bi-check2-square me-1" aria-hidden="true" />
          {confirmando
            ? 'Confirmando...'
            : confirmada && !hayCambios
              ? 'Declaración confirmada'
              : 'Confirmar declaración'}
        </Button>
      </div>
    </>
  );
}

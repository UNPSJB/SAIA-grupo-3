import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, ListGroup, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { ajustarOrdenIngredientes, getListaIngredientes, volverOrdenAutomatico } from './recetaApi';
import type { ListaIngredientes } from './types';

const NOMBRES_FORMATO: Record<ListaIngredientes['formato'], string> = {
  funcion_nombre: 'función y nombre',
  funcion_ins: 'función y número INS',
  funcion_nombre_ins: 'función, nombre y número INS',
};

const formatoPorcentaje = (valor: number | null) =>
  valor === null
    ? '—'
    : `${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

interface ListaIngredientesVersionProps {
  versionId: number;
  editable: boolean;
  onVerComposicion: () => void;
}

export function ListaIngredientesVersion({
  versionId,
  editable,
  onVerComposicion,
}: ListaIngredientesVersionProps) {
  const consulta = useConsulta(() => getListaIngredientes(versionId), [versionId]);
  const [actualizada, setActualizada] = useState<ListaIngredientes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const lista = actualizada?.version_id === versionId ? actualizada : consulta.datos;

  const ejecutar = async (accion: () => Promise<ListaIngredientes>) => {
    setGuardando(true);
    setError(null);
    try {
      setActualizada(await accion());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el orden.');
    } finally {
      setGuardando(false);
    }
  };

  const mover = (indice: number, destino: number) => {
    if (!lista) return;
    const ids = lista.ingredientes.map((ingrediente) => ingrediente.renglon_id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    void ejecutar(() => ajustarOrdenIngredientes(versionId, ids));
  };

  const copiar = async () => {
    if (!lista?.texto) return;
    await navigator.clipboard.writeText(lista.texto);
    setCopiado(true);
  };

  if (consulta.error) return <ErrorAlert mensaje={consulta.error} />;
  if (!lista) return <LoadingSpinner mensaje="Armando la lista de ingredientes..." />;

  const puedeAjustar = editable && lista.completa;
  const fueraDeOrden = lista.ingredientes.filter(
    (ingrediente) => ingrediente.fuera_de_orden,
  ).length;

  return (
    <>
      {error && <ErrorAlert mensaje={error} />}
      {!lista.completa && (
        <Alert
          variant="warning"
          className="d-flex flex-wrap align-items-center justify-content-between gap-2"
        >
          <span>
            <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
            Faltan equivalencias en la composición: no se puede ordenar por porcentaje ni armar el
            texto del rótulo.
          </span>
          <Button size="sm" variant="outline-dark" onClick={onVerComposicion}>
            Ver composición
          </Button>
        </Alert>
      )}
      {lista.aviso_orden_anterior && (
        <Alert variant="info">
          La versión anterior tenía el orden ajustado manualmente. Como cambiaron los porcentajes,
          esta versión volvió al orden automático: revisalo y, si hace falta, ajustalo de nuevo.
        </Alert>
      )}

      <Card className="shadow-sm mb-4 border-primary-subtle">
        <Card.Header className="bg-body fw-semibold d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>Texto para el rótulo</span>
          {lista.texto && (
            <Button size="sm" variant="outline-primary" onClick={() => void copiar()}>
              <i className="bi bi-clipboard me-1" aria-hidden="true" />
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          {lista.texto ? (
            <p className="fs-5 mb-2" style={{ lineHeight: 1.5 }}>
              {lista.texto}
            </p>
          ) : (
            <p className="text-body-secondary mb-2">
              Disponible cuando la composición esté completa.
            </p>
          )}
          <div className="small text-body-secondary">
            Aditivos declarados con {NOMBRES_FORMATO[lista.formato]}.{' '}
            <Link to="/configuracion-produccion">Cambiar formato</Link>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-body d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span className="fw-semibold">Ingredientes, de mayor a menor</span>
              {lista.manual ? (
                <Badge bg="warning" text="dark">
                  Orden ajustado manualmente
                </Badge>
              ) : (
                <Badge bg="secondary">Orden automático</Badge>
              )}
            </Card.Header>
            {lista.manual && (
              <Card.Body className="py-2 small text-body-secondary border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
                <span>
                  Ajustado por {lista.ajustado_por?.nombre} {lista.ajustado_por?.apellido} el{' '}
                  {formatearFechaHora(lista.ajustado_en)}
                </span>
                {editable && (
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={guardando}
                    onClick={() => void ejecutar(() => volverOrdenAutomatico(versionId))}
                  >
                    Volver al orden automático
                  </Button>
                )}
              </Card.Body>
            )}
            {fueraDeOrden > 0 && (
              <Alert variant="danger" className="m-3 mb-0 py-2 small">
                El orden manual pone{' '}
                {fueraDeOrden === 1 ? 'un ingrediente' : `${fueraDeOrden} ingredientes`} por delante
                de otro con menor porcentaje. Revisalo antes de usar el texto.
              </Alert>
            )}
            {lista.hay_empates && !lista.manual && puedeAjustar && (
              <div className="px-3 pt-3 small text-body-secondary">
                Hay ingredientes con el mismo porcentaje: se muestran en el orden en que se
                cargaron. Podés ajustarlo con las flechas.
              </div>
            )}
            <ListGroup variant="flush" as="ol" className="mt-2">
              {lista.ingredientes.map((ingrediente, indice) => (
                <ListGroup.Item
                  as="li"
                  key={ingrediente.renglon_id}
                  className={`d-flex align-items-center gap-3 ${ingrediente.fuera_de_orden ? 'list-group-item-danger' : ''}`}
                >
                  <span className="fw-bold text-body-secondary" style={{ width: 24 }}>
                    {ingrediente.posicion}
                  </span>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{ingrediente.denominacion}</div>
                    {ingrediente.denominacion !== ingrediente.insumo.nombre && (
                      <div className="small text-body-secondary">
                        Insumo: {ingrediente.insumo.nombre}
                      </div>
                    )}
                  </div>
                  <span className="text-nowrap">{formatoPorcentaje(ingrediente.porcentaje)}</span>
                  {puedeAjustar && (
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        aria-label={`Subir ${ingrediente.denominacion}`}
                        title="Subir"
                        disabled={guardando || indice === 0}
                        onClick={() => mover(indice, indice - 1)}
                      >
                        <i className="bi bi-arrow-up" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        aria-label={`Bajar ${ingrediente.denominacion}`}
                        title="Bajar"
                        disabled={guardando || indice === lista.ingredientes.length - 1}
                        onClick={() => mover(indice, indice + 1)}
                      >
                        <i className="bi bi-arrow-down" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-body fw-semibold">
              Aditivos, agrupados por función
            </Card.Header>
            {lista.grupos_aditivos.length === 0 ? (
              <Card.Body className="text-body-secondary">Esta versión no tiene aditivos.</Card.Body>
            ) : (
              <ListGroup variant="flush">
                {lista.grupos_aditivos.map((grupo) => (
                  <ListGroup.Item key={grupo.clase_funcional.id}>
                    <div className="fw-semibold">{grupo.declaracion}</div>
                    <div className="small text-body-secondary">
                      {grupo.solo_funcion && 'Se declara solo por su función · '}
                      {grupo.aditivos
                        .map(
                          (aditivo) =>
                            `${aditivo.insumo.nombre} (${formatoPorcentaje(aditivo.porcentaje)})`,
                        )
                        .join(', ')}
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}

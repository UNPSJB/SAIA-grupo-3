import { useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Form, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { RESULTADOS } from './etiquetas';
import { getAplicabilidad, guardarAplicabilidad } from './rotuladoApi';
import type { AplicabilidadProducto as Estado, Hecho, TipoProducto } from './types';

interface Respuestas {
  envasado: boolean | null;
  tipo: TipoProducto;
  valores: Partial<Record<Hecho, boolean>>;
  motivos: Partial<Record<Hecho, string>>;
}

const siNo = (valor: boolean | null) => (valor === null ? '—' : valor ? 'Sí' : 'No');

const ESTILO_RESULTADO = {
  no_corresponde: { variante: 'secondary', icono: 'bi-dash-circle' },
  exceptuado: { variante: 'info', icono: 'bi-check-circle' },
  corresponde: { variante: 'warning', icono: 'bi-exclamation-octagon' },
} as const;

function respuestasIniciales(estado: Estado): Respuestas {
  return {
    envasado: estado.envasado_ausencia_cliente,
    tipo: estado.tipo_producto,
    valores: Object.fromEntries(estado.agregados.map((a) => [a.hecho, a.valor])),
    motivos: {},
  };
}

function Paso({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h6 className="d-flex align-items-center gap-2 mb-3">
        <Badge bg="primary" pill>
          {numero}
        </Badge>
        {titulo}
      </h6>
      <div className="ps-md-4">{children}</div>
    </section>
  );
}

<<<<<<< HEAD
export function AplicabilidadProducto({
  productoId,
  onIrASellos,
}: {
  productoId: number;
  onIrASellos?: () => void;
}) {
=======
export function AplicabilidadProducto({ productoId }: { productoId: number }) {
>>>>>>> dev
  const consulta = useConsulta(() => getAplicabilidad(productoId), [productoId]);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [respuestas, setRespuestas] = useState<Respuestas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  const actual = estado ?? consulta.datos;
  if (consulta.error && !actual) return <ErrorAlert mensaje={consulta.error} />;
  if (!actual) return <LoadingSpinner mensaje="Cargando rotulado frontal..." />;

  const resp = respuestas ?? respuestasIniciales(actual);
  const cambiar = (cambios: Partial<Respuestas>) => setRespuestas({ ...resp, ...cambios });

  const evaluar = async () => {
    if (resp.envasado === null) {
      setError('Indicá cómo se comercializa el producto.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const nuevo = await guardarAplicabilidad(productoId, {
        envasado_ausencia_cliente: resp.envasado,
        tipo_producto: resp.tipo,
        correcciones: actual.agregados.map((a) => ({
          hecho: a.hecho,
          valor: resp.valores[a.hecho] ?? a.valor,
          motivo: resp.motivos[a.hecho]?.trim() || null,
        })),
      });
      setEstado(nuevo);
      setRespuestas(respuestasIniciales(nuevo));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo evaluar.');
    } finally {
      setGuardando(false);
    }
  };

  const evaluacion = actual.evaluacion;
  const estilo = evaluacion ? ESTILO_RESULTADO[evaluacion.resultado] : null;

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-body-tertiary py-3 d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <h5 className="mb-0 text-secondary">Rotulado frontal</h5>
        <span className="small text-body-secondary">
          {actual.receta ? (
            <Link to={`/recetas/${actual.receta.receta_id}`}>
              Receta vigente: versión {actual.receta.numero}
            </Link>
          ) : (
            'Sin receta'
          )}
        </span>
      </Card.Header>
      <Card.Body className="p-3 p-md-4">
        {actual.avisos.map((aviso) => (
          <Alert key={aviso} variant="warning" className="py-2 small">
            {aviso}
          </Alert>
        ))}

        <Paso numero={1} titulo="¿Cómo se comercializa?">
          <Form.Check
            type="radio"
            id={`envasado-si-${productoId}`}
            name={`envasado-${productoId}`}
            label="Envasado en ausencia del cliente, listo para ofrecer al consumidor"
            checked={resp.envasado === true}
            onChange={() => cambiar({ envasado: true })}
          />
          <Form.Check
            type="radio"
            id={`envasado-no-${productoId}`}
            name={`envasado-${productoId}`}
            label="No: a granel, fraccionado o envasado en el mostrador a pedido del cliente"
            checked={resp.envasado === false}
            onChange={() => cambiar({ envasado: false })}
          />
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
            <span className="small">El producto es</span>
            <ButtonGroup size="sm">
              {(['solido', 'liquido'] as TipoProducto[]).map((tipo) => (
                <Button
                  key={tipo}
                  variant={resp.tipo === tipo ? 'secondary' : 'outline-secondary'}
                  onClick={() => cambiar({ tipo })}
                >
                  {tipo === 'solido' ? 'Sólido' : 'Líquido'}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </Paso>

        {resp.envasado === true && (
          <Paso numero={2} titulo="¿Qué lleva agregado?">
            <p className="small text-body-secondary">
              El sistema lo sugiere a partir de la receta vigente y de las marcas de cada insumo. Si
              no es correcto, corregilo.
            </p>
            <div className="small">
              {actual.agregados.map((agregado) => {
                const valor = resp.valores[agregado.hecho] ?? agregado.valor;
                const corregido = valor !== agregado.sugerido;
                return (
                  <div
                    key={agregado.hecho}
                    className="d-flex flex-wrap gap-2 justify-content-between align-items-start border-bottom py-2"
                  >
                    <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
                      <div className="fw-semibold">
                        {agregado.etiqueta.charAt(0).toUpperCase() + agregado.etiqueta.slice(1)}
                      </div>
                      <div className="d-flex flex-wrap gap-1 align-items-center mt-1">
                        <Badge bg="light" text="dark" className="border fw-normal">
                          Sugerido por el sistema: {agregado.sugerido ? 'Sí' : 'No'}
                        </Badge>
                        {corregido && (
                          <Badge bg="warning" text="dark">
                            Corregido
                          </Badge>
                        )}
                      </div>
                      {agregado.causas.length > 0 && (
                        <div className="text-body-secondary mt-1">
                          Por: {agregado.causas.map((c) => c.nombre).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-end ms-auto" style={{ maxWidth: '100%' }}>
                      <ButtonGroup size="sm" aria-label={agregado.etiqueta}>
                        <Button
                          variant={valor ? 'dark' : 'outline-dark'}
                          onClick={() =>
                            cambiar({ valores: { ...resp.valores, [agregado.hecho]: true } })
                          }
                        >
                          Sí
                        </Button>
                        <Button
                          variant={!valor ? 'dark' : 'outline-dark'}
                          onClick={() =>
                            cambiar({ valores: { ...resp.valores, [agregado.hecho]: false } })
                          }
                        >
                          No
                        </Button>
                      </ButtonGroup>
                      {corregido && agregado.corregido === null && (
                        <Form.Control
                          size="sm"
                          className="mt-2"
                          maxLength={300}
                          placeholder="Motivo de la corrección (opcional)"
                          aria-label={`Motivo: ${agregado.etiqueta}`}
                          value={resp.motivos[agregado.hecho] ?? ''}
                          onChange={(e) =>
                            cambiar({
                              motivos: { ...resp.motivos, [agregado.hecho]: e.target.value },
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Paso>
        )}

        <Paso numero={resp.envasado === true ? 3 : 2} titulo="Resultado">
          {error && <ErrorAlert mensaje={error} />}
          <Button onClick={evaluar} disabled={guardando || resp.envasado === null}>
            {guardando ? 'Evaluando...' : evaluacion ? 'Guardar y volver a evaluar' : 'Evaluar'}
          </Button>
          {evaluacion && estilo && (
            <Alert variant={estilo.variante} className="mt-3 mb-0">
              <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                <i className={`bi ${estilo.icono} fs-5`} aria-hidden="true" />
                <strong>{RESULTADOS[evaluacion.resultado].etiqueta}</strong>
              </div>
              <div>{evaluacion.mensaje}</div>
              <div className="small mt-2">
                Parámetros normativos versión {evaluacion.conjunto.numero} (vigencia{' '}
                {formatearFecha(evaluacion.conjunto.fecha_vigencia)}) · evaluado{' '}
                {formatearFechaHora(evaluacion.evaluado_en)}
                {evaluacion.evaluado_por &&
                  ` por ${evaluacion.evaluado_por.nombre} ${evaluacion.evaluado_por.apellido}`}
              </div>
<<<<<<< HEAD
              {evaluacion.resultado === 'corresponde' && onIrASellos && (
                <div className="mt-3">
                  <Button variant="dark" size="sm" onClick={onIrASellos}>
                    Ir al cálculo de sellos
                  </Button>
=======
              {evaluacion.resultado === 'corresponde' && (
                <div className="mt-3">
                  <Button
                    variant="dark"
                    size="sm"
                    disabled
                    title="Se habilita con el cálculo de sellos (E12-02)"
                  >
                    Ir al cálculo de sellos
                  </Button>
                  <span className="small ms-2">Se habilita con el cálculo de sellos.</span>
>>>>>>> dev
                </div>
              )}
            </Alert>
          )}
        </Paso>

        <div className="border-top pt-3">
          <Button
            variant="link"
            className="p-0 text-decoration-none"
            aria-expanded={verHistorial}
            onClick={() => setVerHistorial(!verHistorial)}
          >
            {verHistorial
              ? '▾ Ocultar correcciones'
              : `▸ Ver correcciones (${actual.historial.length})`}
          </Button>
          {verHistorial &&
            (actual.historial.length === 0 ? (
              <p className="small text-body-secondary mt-2 mb-0">
                No hay correcciones registradas.
              </p>
            ) : (
              <Table responsive size="sm" className="small mt-2 mb-0 align-middle">
                <thead>
                  <tr className="text-body-secondary">
                    <th>Fecha</th>
                    <th>Dato</th>
                    <th>Sugerido</th>
                    <th>Antes</th>
                    <th>Después</th>
                    <th>Motivo</th>
                    <th>Persona</th>
                  </tr>
                </thead>
                <tbody>
                  {actual.historial.map((m) => (
                    <tr key={m.id}>
                      <td className="text-nowrap">{formatearFechaHora(m.fecha_hora)}</td>
                      <td>{m.etiqueta}</td>
                      <td>{siNo(m.valor_sugerido)}</td>
                      <td>{m.valor_anterior === null ? 'Sugerencia' : siNo(m.valor_anterior)}</td>
                      <td>
                        {m.valor_nuevo === null ? 'Vuelve a la sugerencia' : siNo(m.valor_nuevo)}
                      </td>
                      <td>{m.motivo ?? '—'}</td>
                      <td className="text-nowrap">
                        {m.personal.nombre} {m.personal.apellido}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ))}
        </div>
      </Card.Body>
    </Card>
  );
}

import { useState } from 'react';
import { Alert, Badge, Button, Card, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { HECHOS, NUTRIENTES, SELLOS } from './etiquetas';
import { LeyendaPrecautoria, Octogono } from './Octogono';
import { calcularSellos, getCalculoSellos, getSellos } from './rotuladoApi';
import type { CalculoSellos, NutrienteEvaluable, SellosProducto as EstadoSellos } from './types';

const formato = (valor: number) => valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });

function datosUsados(datos: Record<string, number>) {
  return Object.entries(datos)
    .map(([clave, valor]) => {
      if (clave === 'factor_energetico') return `factor ${formato(valor)} kcal/g`;
      const etiqueta = NUTRIENTES[clave as NutrienteEvaluable] ?? clave;
      return `${etiqueta.replace(/ \(.+\)$/, '')}: ${formato(valor)} ${etiqueta.match(/\((.+)\)$/)?.[1] ?? ''}`;
    })
    .join(' · ');
}

function Estado({ detalle }: { detalle: { evaluado: boolean; supera: boolean } }) {
  if (!detalle.evaluado)
    return (
      <Badge bg="light" text="dark" className="border">
        No evaluado
      </Badge>
    );
  return detalle.supera ? <Badge bg="danger">Supera</Badge> : <Badge bg="success">No supera</Badge>;
}

function Resultado({ calculo }: { calculo: CalculoSellos }) {
  const base = calculo.base ?? 'g';
  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        {calculo.provisorio && (
          <Badge bg="warning" text="dark" title="La tabla nutricional está incompleta">
            <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />
            Provisorio
          </Badge>
        )}
        <span className="small text-body-secondary">
          Parámetros normativos versión {calculo.conjunto.numero} · vigencia{' '}
          {formatearFecha(calculo.conjunto.fecha_vigencia)} · receta versión{' '}
          {calculo.version_receta.numero} · calculado {formatearFechaHora(calculo.calculado_en)} por{' '}
          {calculo.calculado_por.nombre} {calculo.calculado_por.apellido}
        </span>
      </div>
      {calculo.provisorio && (
        <Alert variant="warning" className="py-2 small">
          <div className="fw-semibold">
            Resultado provisorio: la tabla nutricional está incompleta. Los nutrientes sin dato no
            se evalúan.
          </div>
          <ul className="mb-0">
            {calculo.faltantes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div
        className="d-flex flex-wrap gap-3 align-items-center p-3 rounded mb-3"
        style={{ background: '#f3f3f3' }}
        aria-label="Sellos que corresponden"
      >
        {calculo.leyendas.length === 0 && calculo.advertencias.length === 0 && (
          <span className="text-body-secondary">No corresponde ningún sello ni leyenda.</span>
        )}
        {calculo.leyendas.map((leyenda) => (
          <Octogono key={leyenda} leyenda={leyenda} tamano={112} />
        ))}
        {calculo.advertencias.map((texto) => (
          <LeyendaPrecautoria key={texto} texto={texto} />
        ))}
      </div>
      <div className="small text-body-secondary mb-2">
        Datos: {calculo.tipo_producto === 'liquido' ? 'producto líquido' : 'producto sólido'},
        valores por 100 {base} de la tabla nutricional
        {calculo.hechos.length > 0 &&
          ` · ${calculo.hechos
            .filter((h) => h !== 'envasado_ausencia_cliente')
            .map((h) => HECHOS[h].toLowerCase())
            .join(', ')}`}
      </div>
      <div className="d-md-none small">
        {calculo.detalle.map((d) => (
          <div
            key={d.orden}
            className={`border-bottom py-2 px-1${d.supera ? ' bg-danger-subtle' : ''}`}
          >
            <div className="d-flex justify-content-between gap-2">
              <span className="fw-semibold">{SELLOS[d.sello]}</span>
              <Estado detalle={d} />
            </div>
            <div>{d.operacion ?? <span className="text-body-secondary">{d.motivo}</span>}</div>
            <div className="text-body-secondary">
              Umbral: {d.simbolo} {formato(d.limite)} {d.unidad}
            </div>
            {d.evaluado && d.motivo && <div className="text-body-secondary">{d.motivo}</div>}
          </div>
        ))}
      </div>
      <Table responsive size="sm" className="small align-middle mb-0 d-none d-md-table">
        <thead>
          <tr className="text-body-secondary">
            <th>Sello</th>
            <th>Datos usados</th>
            <th>Cálculo</th>
            <th className="text-nowrap">Umbral</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {calculo.detalle.map((d) => (
            <tr key={d.orden} className={d.supera ? 'table-danger' : undefined}>
              <td className="text-nowrap">{SELLOS[d.sello]}</td>
              <td>{d.evaluado ? datosUsados(d.datos) : '—'}</td>
              <td>{d.operacion ?? <span className="text-body-secondary">{d.motivo}</span>}</td>
              <td className="text-nowrap">
                {d.simbolo} {formato(d.limite)} {d.unidad}
              </td>
              <td>
                <Estado detalle={d} />
                {d.evaluado && d.motivo && <div className="text-body-secondary">{d.motivo}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export function SellosProducto({
  productoId,
  onIrAAplicabilidad,
}: {
  productoId: number;
  onIrAAplicabilidad?: () => void;
}) {
  const consulta = useConsulta(() => getSellos(productoId), [productoId]);
  const [estado, setEstado] = useState<EstadoSellos | null>(null);
  const [historico, setHistorico] = useState<CalculoSellos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  const actual = estado ?? consulta.datos;
  if (consulta.error && !actual) return <ErrorAlert mensaje={consulta.error} />;
  if (!actual) return <LoadingSpinner mensaje="Cargando sellos..." />;

  const calcular = async () => {
    setCalculando(true);
    setError(null);
    try {
      setEstado(await calcularSellos(productoId));
      setHistorico(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron calcular los sellos.');
    } finally {
      setCalculando(false);
    }
  };

  const verCalculo = async (id: number) => {
    setError(null);
    try {
      setHistorico(id === actual.calculo?.id ? null : await getCalculoSellos(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el cálculo.');
    }
  };

  const mostrado = historico ?? actual.calculo;

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-body-tertiary py-3 d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <h5 className="mb-0 text-secondary">Sellos de advertencia</h5>
        {actual.puede_calcular && (
          <Button size="sm" onClick={calcular} disabled={calculando}>
            {calculando
              ? 'Calculando...'
              : actual.calculo
                ? 'Volver a calcular'
                : 'Calcular sellos'}
          </Button>
        )}
      </Card.Header>
      <Card.Body className="p-3 p-md-4">
        {!actual.puede_calcular && actual.motivo_no_calcula && (
          <Alert
            variant="secondary"
            className="d-flex flex-wrap gap-2 align-items-center justify-content-between"
          >
            <span>{actual.motivo_no_calcula}</span>
            {onIrAAplicabilidad && (
              <Button size="sm" variant="outline-dark" onClick={onIrAAplicabilidad}>
                Ir a Rotulado frontal
              </Button>
            )}
          </Alert>
        )}
        {actual.avisos.map((aviso) => (
          <Alert key={aviso} variant="warning" className="py-2 small">
            {aviso}
          </Alert>
        ))}
        {error && <ErrorAlert mensaje={error} />}
        {historico && (
          <Alert
            variant="info"
            className="py-2 small d-flex flex-wrap gap-2 justify-content-between align-items-center"
          >
            <span>
              Estás viendo un cálculo anterior, con los parámetros y la receta de ese momento.
            </span>
            <Button size="sm" variant="outline-dark" onClick={() => setHistorico(null)}>
              Ver el último
            </Button>
          </Alert>
        )}
        {mostrado ? (
          <Resultado calculo={mostrado} />
        ) : (
          actual.puede_calcular && (
            <p className="text-body-secondary mb-0">
              Todavía no se calcularon los sellos. Se usan la tabla nutricional de la receta
              vigente, los agregados evaluados y los{' '}
              <Link to="/parametros-normativos">parámetros normativos</Link> vigentes.
            </p>
          )
        )}
        {actual.historial.length > 0 && (
          <div className="border-top pt-3 mt-3">
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              aria-expanded={verHistorial}
              onClick={() => setVerHistorial(!verHistorial)}
            >
              {verHistorial
                ? '▾ Ocultar cálculos anteriores'
                : `▸ Ver cálculos (${actual.historial.length})`}
            </Button>
            {verHistorial && (
              <Table responsive size="sm" hover className="small mt-2 mb-0 align-middle">
                <thead>
                  <tr className="text-body-secondary">
                    <th>Fecha</th>
                    <th>Parámetros</th>
                    <th>Receta</th>
                    <th>Sellos</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {actual.historial.map((c) => (
                    <tr key={c.id}>
                      <td className="text-nowrap">{formatearFechaHora(c.calculado_en)}</td>
                      <td>v{c.conjunto_numero}</td>
                      <td>v{c.receta_numero}</td>
                      <td>
                        {c.sellos.length ? c.sellos.map((s) => SELLOS[s]).join(', ') : 'Ninguno'}
                        {c.provisorio && (
                          <Badge bg="warning" text="dark" className="ms-1">
                            Provisorio
                          </Badge>
                        )}
                      </td>
                      <td className="text-end">
                        <Button size="sm" variant="link" onClick={() => verCalculo(c.id)}>
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

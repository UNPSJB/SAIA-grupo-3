import { useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Badge, Button, ButtonGroup, Card, Form, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ReporteImpresion, imprimirDocumento } from '../../shared/components/ReporteImpresion';
import { useAuth } from '../../shared/hooks/useAuth';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { AvisoFaltantes } from './AvisoFaltantes';
import { CompletarInsumoModal } from './CompletarInsumoModal';
import { formatearValor } from './formato';
import { InsigniaIncompleta } from './InsigniaIncompleta';
import { TablaNutricional } from './TablaNutricional';
import { getInformacionVersion } from './nutricionApi';
import { SUBNUTRIENTES, type ExpresionValor } from './types';

function Celda({
  valor,
  unidad,
  verCalculado,
}: {
  valor: ExpresionValor | null;
  unidad: string;
  verCalculado: boolean;
}) {
  if (!valor) return <span className="text-body-tertiary">—</span>;
  return (
    <>
      <span className={valor.no_significativo ? 'text-body-secondary' : 'fw-semibold'}>
        {valor.texto}
        {!valor.no_significativo && ` ${unidad}`}
      </span>
      {valor.no_significativo && (
        <Badge
          bg="light"
          text="dark"
          className="ms-1 border fw-normal d-none d-md-inline-block"
          title="Debajo del umbral"
        >
          no significativo
        </Badge>
      )}
      {verCalculado && (
        <div className="small text-body-secondary">calc. {formatearValor(valor.calculado)}</div>
      )}
    </>
  );
}

interface Props {
  versionId: number;
  onVerComposicion?: () => void;
  rutaNuevaVersion?: string;
  onActualizada?: (completa: boolean) => void;
}

export function InformacionNutricionalVersion({
  versionId,
  onVerComposicion,
  rutaNuevaVersion,
  onActualizada,
}: Props) {
  const { currentUser } = useAuth();
  const [revision, setRevision] = useState(0);
  const consulta = useConsulta(async () => {
    const info = await getInformacionVersion(versionId);
    onActualizada?.(info.completa);
    return info;
  }, [versionId, revision]);
  const [verCalculado, setVerCalculado] = useState(false);
  const [completando, setCompletando] = useState<{ id: number; nombre: string } | null>(null);
  const [vista, setVista] = useState<'calculo' | 'rotulo'>('calculo');
  const [fechaImpresion, setFechaImpresion] = useState<string | null>(null);

  const imprimir = () => {
    flushSync(() => setFechaImpresion(new Date().toISOString()));
    imprimirDocumento('imprimiendo-tabla-nutricional');
  };

  if (consulta.error) return <ErrorAlert mensaje={consulta.error} />;
  if (!consulta.datos) return <LoadingSpinner mensaje="Calculando información nutricional..." />;

  const info = consulta.datos;
  const base = info.base ?? 'g';
  const tienePorcion = info.porcion_base !== null;
  const porcionIncompatible =
    info.base === null || info.faltantes.some((faltante) => faltante.tipo === 'porcion');

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-body d-flex flex-wrap gap-2 align-items-center justify-content-between py-3">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="fw-semibold">Información nutricional</span>
          <InsigniaIncompleta completa={info.completa} mostrarCompleta />
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="small text-body-secondary">
            Calculada {formatearFechaHora(info.calculada_en)}
          </span>
          <ButtonGroup size="sm" aria-label="Vista de la información nutricional">
            <Button
              variant={vista === 'calculo' ? 'secondary' : 'outline-secondary'}
              onClick={() => setVista('calculo')}
            >
              Cálculo
            </Button>
            <Button
              variant={vista === 'rotulo' ? 'secondary' : 'outline-secondary'}
              onClick={() => setVista('rotulo')}
            >
              Formato de rótulo
            </Button>
          </ButtonGroup>
          {vista === 'rotulo' && (
            <Button size="sm" variant="primary" onClick={imprimir}>
              <i className="bi bi-printer-fill me-1" aria-hidden="true" />
              Imprimir / guardar PDF
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-3 p-md-4">
        <AvisoFaltantes
          faltantes={info.faltantes}
          onCompletar={setCompletando}
          onVerComposicion={onVerComposicion}
          rutaNuevaVersion={rutaNuevaVersion}
        />
        {vista === 'calculo' ? (
          <>
            <div className="d-flex flex-wrap gap-3 small text-body-secondary mb-3">
              {info.rendimiento_base !== null && (
                <span>
                  Rendimiento final: <strong>{formatearValor(info.rendimiento_base, base)}</strong>
                </span>
              )}
              <span>
                Porción:{' '}
                <strong>
                  {tienePorcion
                    ? formatearValor(info.porcion_base, base)
                    : porcionIncompatible
                      ? 'sin calcular'
                      : 'no declarada'}
                </strong>
                {info.porcion_medida_casera && ` (${info.porcion_medida_casera})`}
              </span>
            </div>
            <Table
              responsive
              size="sm"
              className="align-middle mb-2"
              style={{ fontSize: 'clamp(0.78rem, 2.4vw, 1rem)' }}
            >
              <thead>
                <tr className="small text-body-secondary">
                  <th>Nutriente</th>
                  <th className="text-end">Por 100 {base}</th>
                  <th className="text-end">
                    <span className="d-none d-md-inline">Por porción</span>
                    <span className="d-md-none">Porción</span>
                    {tienePorcion && (
                      <span className="d-none d-md-inline">
                        {` (${formatearValor(info.porcion_base, base)})`}
                      </span>
                    )}
                  </th>
                  <th className="text-end text-nowrap">% VD (*)</th>
                </tr>
              </thead>
              <tbody>
                {info.filas.map((fila) => (
                  <tr key={fila.nutriente}>
                    <td className={SUBNUTRIENTES.includes(fila.nutriente) ? 'ps-4' : ''}>
                      {fila.etiqueta}
                    </td>
                    <td className="text-end text-nowrap">
                      <Celda
                        valor={fila.por_100}
                        unidad={fila.unidad}
                        verCalculado={verCalculado}
                      />
                      {fila.nutriente === 'energia' && info.energia_kj.por_100 && (
                        <div className="small text-body-secondary">
                          = {info.energia_kj.por_100.texto} kJ
                        </div>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      <Celda
                        valor={fila.por_porcion}
                        unidad={fila.unidad}
                        verCalculado={verCalculado}
                      />
                      {fila.nutriente === 'energia' && info.energia_kj.por_porcion && (
                        <div className="small text-body-secondary">
                          = {info.energia_kj.por_porcion.texto} kJ
                        </div>
                      )}
                    </td>
                    <td className="text-end">
                      {fila.porcentaje_vd ? (
                        `${fila.porcentaje_vd.texto} %`
                      ) : (
                        <span className="text-body-tertiary">
                          {fila.valor_diario ? '—' : 'no aplica'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="small text-body-secondary mb-3">(*) {info.leyenda_vd}</p>
            {!tienePorcion && !porcionIncompatible && (
              <p className="small text-body-secondary">
                Para ver los valores por porción y el % VD, declará la porción en una nueva versión
                de la receta.
              </p>
            )}
            <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center border-top pt-3">
              <Form.Check
                type="switch"
                id={`ver-calculado-${versionId}`}
                label="Mostrar los valores calculados sin redondear"
                checked={verCalculado}
                onChange={(evento) => setVerCalculado(evento.target.checked)}
              />
              <Link to="/valores-diarios" className="small">
                Valores diarios y reglas de redondeo
              </Link>
            </div>
          </>
        ) : (
          <>
            <TablaNutricional info={info} />
            {createPortal(
              <div className="rep-portal rep-portal-nutricion tabla-nutricional-impresion">
                <ReporteImpresion
                  titulo={`Información nutricional · ${info.producto}`}
                  fechaEmision={fechaImpresion ?? info.calculada_en}
                  usuario={currentUser}
                  metadatos={[
                    { etiqueta: 'Receta', valor: `Versión ${info.numero} (${info.estado})` },
                    { etiqueta: 'Calculada', valor: formatearFechaHora(info.calculada_en) },
                  ]}
                >
                  <TablaNutricional info={info} />
                </ReporteImpresion>
              </div>,
              document.body,
            )}
          </>
        )}
      </Card.Body>
      <CompletarInsumoModal
        insumo={completando}
        onCambio={() => setRevision((valor) => valor + 1)}
        onCerrar={() => setCompletando(null)}
      />
    </Card>
  );
}
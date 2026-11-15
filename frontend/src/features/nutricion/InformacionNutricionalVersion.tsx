import { useState } from 'react';
import { Alert, Badge, Card, Form, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { formatearValor } from './formato';
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

export function InformacionNutricionalVersion({ versionId }: { versionId: number }) {
  const consulta = useConsulta(() => getInformacionVersion(versionId), [versionId]);
  const [verCalculado, setVerCalculado] = useState(false);

  if (consulta.error) return <ErrorAlert mensaje={consulta.error} />;
  if (!consulta.datos) return <LoadingSpinner mensaje="Calculando información nutricional..." />;

  const info = consulta.datos;
  const base = info.base ?? 'g';
  const tienePorcion = info.porcion_base !== null;
  const porcionIncompatible = info.faltantes.some((faltante) => faltante.startsWith('La porción'));

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-body d-flex flex-wrap gap-2 align-items-center justify-content-between py-3">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="fw-semibold">Información nutricional</span>
          {info.completa ? (
            <Badge bg="success">Completa</Badge>
          ) : (
            <Badge bg="warning" text="dark">
              Incompleta
            </Badge>
          )}
        </div>
        <span className="small text-body-secondary">
          Calculada {formatearFechaHora(info.calculada_en)}
        </span>
      </Card.Header>
      <Card.Body className="p-3 p-md-4">
        {info.faltantes.length > 0 && (
          <Alert variant="warning">
            <div className="fw-semibold mb-1">
              Faltan datos: los valores que dependen de ellos no se calculan.
            </div>
            <ul className="mb-0 small">
              {info.faltantes.map((faltante) => (
                <li key={faltante}>{faltante}</li>
              ))}
            </ul>
          </Alert>
        )}
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
                  <Celda valor={fila.por_100} unidad={fila.unidad} verCalculado={verCalculado} />
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
            Para ver los valores por porción y el % VD, declará la porción en una nueva versión de
            la receta.
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
      </Card.Body>
    </Card>
  );
}

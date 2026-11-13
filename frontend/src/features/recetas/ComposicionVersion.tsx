import { Alert, Badge, Card, Col, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { GraficoBarras, TarjetaGrafico } from '../../shared/components/graficos';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { textoAditivo } from '../aditivos/aditivosApi';
import { cantidadConUnidad } from './formato';
import { getComposicion } from './recetaApi';
import type { FaltanteComposicion, GrupoComposicion } from './types';

const formatoPorcentaje = (valor: number) =>
  `${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const formatoGramos = (valor: number) =>
  `${valor.toLocaleString('es-AR', { maximumFractionDigits: 3 })} g`;

function enlaceFaltante(faltante: FaltanteComposicion) {
  if (faltante.equivalencia === 'densidad' || faltante.equivalencia === 'peso_unidad') {
    return { ruta: `/insumos/${faltante.insumo.id}/editar`, texto: 'Completar en el insumo' };
  }
  return {
    ruta: `/unidades-medida/${faltante.unidad_medida.id}/editar`,
    texto: 'Completar en la unidad',
  };
}

function TablaGrupo({
  titulo,
  grupo,
  aditivos,
}: {
  titulo: string;
  grupo: GrupoComposicion;
  aditivos: boolean;
}) {
  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-body fw-semibold d-flex justify-content-between">
        <span>
          {titulo} <Badge bg="secondary">{grupo.renglones.length}</Badge>
        </span>
        {grupo.subtotal_porcentaje !== null && (
          <span className="text-body-secondary fw-normal">
            {formatoPorcentaje(grupo.subtotal_porcentaje)}
          </span>
        )}
      </Card.Header>
      {grupo.renglones.length === 0 ? (
        <Card.Body className="text-body-secondary">
          Esta versión no tiene {titulo.toLowerCase()}.
        </Card.Body>
      ) : (
        <Table responsive size="sm" className="mb-0 align-middle">
          <thead>
            <tr>
              <th>{aditivos ? 'Aditivo' : 'Ingrediente'}</th>
              <th className="text-end">Cantidad</th>
              <th className="text-end">Gramos</th>
              <th className="text-end">%</th>
            </tr>
          </thead>
          <tbody>
            {grupo.renglones.map((renglon) => (
              <tr
                key={renglon.renglon_id}
                className={renglon.gramos === null ? 'table-warning' : undefined}
              >
                <td>
                  <div>{renglon.insumo.nombre}</div>
                  {renglon.aditivo_referencia && (
                    <div className="small text-body-secondary">
                      {renglon.aditivo_referencia.clase_funcional.nombre} ·{' '}
                      {textoAditivo(renglon.aditivo_referencia)}
                    </div>
                  )}
                </td>
                <td className="text-end text-nowrap">
                  {cantidadConUnidad(renglon.cantidad, renglon.unidad_medida.sufijo)}
                </td>
                <td className="text-end text-nowrap">
                  {renglon.gramos === null ? (
                    <Badge bg="warning" text="dark">
                      Sin equivalencia
                    </Badge>
                  ) : (
                    formatoGramos(renglon.gramos)
                  )}
                </td>
                <td className="text-end text-nowrap fw-semibold">
                  {renglon.porcentaje === null ? '—' : formatoPorcentaje(renglon.porcentaje)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

export function ComposicionVersion({ versionId }: { versionId: number }) {
  const consulta = useConsulta(() => getComposicion(versionId), [versionId]);

  if (consulta.error) return <ErrorAlert mensaje={consulta.error} />;
  if (!consulta.datos) return <LoadingSpinner mensaje="Calculando composición..." />;

  const composicion = consulta.datos;
  const datosGrafico = [...composicion.ingredientes.renglones, ...composicion.aditivos.renglones]
    .filter((renglon) => renglon.porcentaje !== null)
    .sort((a, b) => (b.porcentaje ?? 0) - (a.porcentaje ?? 0))
    .map((renglon) => ({
      id: renglon.renglon_id,
      etiqueta: renglon.insumo.nombre,
      valor: renglon.porcentaje ?? 0,
      color: renglon.tipo === 'aditivo' ? 'info' : 'primary',
    }));

  return (
    <>
      {composicion.faltantes.length > 0 && (
        <Alert variant="warning">
          <Alert.Heading as="h3" className="h6">
            <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
            No se puede calcular el porcentaje: faltan equivalencias
          </Alert.Heading>
          <p className="small mb-2">
            El sistema no asume valores. Completá estos datos y la composición se recalcula sola.
          </p>
          <ul className="mb-0">
            {composicion.faltantes.map((faltante) => {
              const enlace = enlaceFaltante(faltante);
              return (
                <li key={`${faltante.insumo.id}-${faltante.equivalencia}`}>
                  {faltante.mensaje} <Link to={enlace.ruta}>{enlace.texto}</Link>
                </li>
              );
            })}
          </ul>
        </Alert>
      )}

      <Row className="g-3 mb-4">
        <Col sm={6} lg={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="small text-body-secondary">Peso total de la formulación</div>
              <div className="fs-4 fw-semibold">
                {composicion.total_gramos === null ? '—' : formatoGramos(composicion.total_gramos)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={4}>
          <Card
            className={`shadow-sm h-100 border-${composicion.verificacion_ok ? 'success' : 'warning'}`}
          >
            <Card.Body>
              <div className="small text-body-secondary">Verificación</div>
              {composicion.suma_porcentajes === null ? (
                <div className="fs-5 fw-semibold text-warning-emphasis">Composición incompleta</div>
              ) : composicion.verificacion_ok ? (
                <div className="fs-5 fw-semibold text-success">
                  <i className="bi bi-check-circle me-1" aria-hidden="true" />
                  Suma 100 %
                </div>
              ) : (
                <div className="fs-5 fw-semibold text-danger">
                  Suma {formatoPorcentaje(composicion.suma_porcentajes)} (diferencia{' '}
                  {formatoPorcentaje(composicion.diferencia ?? 0)})
                </div>
              )}
              {composicion.suma_porcentajes !== null && (
                <div className="small text-body-secondary">
                  {formatoPorcentaje(composicion.suma_porcentajes)} · tolerancia de redondeo ±
                  {composicion.tolerancia.toLocaleString('es-AR')} %
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="small text-body-secondary">Versión</div>
              <div className="fs-5 fw-semibold">Versión {composicion.version_numero}</div>
              <div className="small text-body-secondary">
                Calculada el {formatearFechaHora(composicion.calculada_en)}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <TablaGrupo titulo="Ingredientes" grupo={composicion.ingredientes} aditivos={false} />
        </Col>
        <Col xl={5}>
          <TablaGrupo titulo="Aditivos" grupo={composicion.aditivos} aditivos />
        </Col>
      </Row>

      {datosGrafico.length > 0 && (
        <TarjetaGrafico
          titulo="Composición porcentual"
          subtitulo="Ingredientes en azul y aditivos en celeste, de mayor a menor."
        >
          <GraficoBarras
            datos={datosGrafico}
            nombreValor="Porcentaje"
            formatoValor={formatoPorcentaje}
          />
        </TarjetaGrafico>
      )}
    </>
  );
}

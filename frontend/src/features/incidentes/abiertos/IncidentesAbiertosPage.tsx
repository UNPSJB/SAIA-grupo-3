import { Badge, Card, Col, Container, Form, Pagination, Row, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { useIncidentesAbiertos } from './useIncidentesAbiertos';
import { TIPOS_INCIDENTE, etiquetaTipoIncidente, type TipoIncidente } from '../types';

// Umbrales del resaltado: a partir de cuántos días abierto se pinta la fila
const DIAS_ALERTA = 7;     // amarillo
const DIAS_CRITICO = 15;   // rojo

function nivelAntiguedad(dias: number) {
  if (dias >= DIAS_CRITICO) return { fila: 'table-danger', badge: 'danger' };
  if (dias >= DIAS_ALERTA) return { fila: 'table-warning', badge: 'warning' };
  return { fila: '', badge: 'secondary' };
}

function textoDias(dias: number): string {
  if (dias === 0) return 'Hoy';
  return dias === 1 ? '1 día' : `${dias} días`;
}

export function IncidentesAbiertosPage() {
  const {
    incidentes, porTipo, loading, error,
    page, totalPages, total, setPage,
    tipo, cambiarTipo, diasMinimos, cambiarDiasMinimos,
  } = useIncidentesAbiertos();

  const totalAbiertos = porTipo.reduce((suma, p) => suma + p.cantidad, 0);

  if (loading) return <LoadingSpinner mensaje="Cargando incidentes abiertos..." />;

  return (
    <Container className="py-2">
      <h2 className="mb-1 border-bottom pb-2 text-secondary">Incidentes abiertos</h2>
      <p className="text-muted small mb-4">
        Incidentes sin acción correctiva registrada, del más antiguo al más reciente.
      </p>

      {error && <ErrorAlert mensaje={error} />}

      {/* Indicador por tipo (E7). Click en una tarjeta = filtrar por ese tipo */}
      <Row className="g-3 mb-4">
        <Col xs={6} md>
          <Card className="h-100 shadow-sm border-0 text-center">
            <Card.Body className="py-3">
              <div className="small text-muted">Total abiertos</div>
              <div className="fs-3 fw-bold">{totalAbiertos}</div>
            </Card.Body>
          </Card>
        </Col>
        {porTipo.map((p) => (
          <Col xs={6} md key={p.tipo}>
            <Card
              role="button"
              title={tipo === p.tipo ? 'Quitar filtro' : 'Filtrar por este tipo'}
              onClick={() => cambiarTipo(tipo === p.tipo ? '' : p.tipo)}
              className={`h-100 shadow-sm text-center ${tipo === p.tipo ? 'border-primary border-2' : 'border-0'}`}
            >
              <Card.Body className="py-3">
                <div className="small text-muted">{etiquetaTipoIncidente(p.tipo)}</div>
                <div className="fs-3 fw-bold">{p.cantidad}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filtros + referencia de colores */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          <Form.Select
            size="sm"
            aria-label="Filtrar por tipo"
            value={tipo}
            onChange={(e) => cambiarTipo(e.target.value as TipoIncidente | '')}
            style={{ maxWidth: '220px' }}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_INCIDENTE.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Form.Select>
          <Form.Select
            size="sm"
            aria-label="Filtrar por antigüedad"
            value={diasMinimos}
            onChange={(e) => cambiarDiasMinimos(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ maxWidth: '220px' }}
          >
            <option value="">Cualquier antigüedad</option>
            <option value={DIAS_ALERTA}>{DIAS_ALERTA} días o más</option>
            <option value={DIAS_CRITICO}>{DIAS_CRITICO} días o más</option>
          </Form.Select>
        </div>
        <div className="d-flex gap-2 small text-muted align-items-center">
          <Badge bg="secondary">Reciente</Badge>
          <Badge bg="warning" text="dark">{DIAS_ALERTA}+ días</Badge>
          <Badge bg="danger">{DIAS_CRITICO}+ días</Badge>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Antigüedad</th>
                <th>Reportado el</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Reportado por</th>
              </tr>
            </thead>
            <tbody>
              {incidentes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    {tipo || diasMinimos !== ''
                      ? 'No hay incidentes abiertos para los filtros actuales.'
                      : 'No hay incidentes abiertos. ¡Todo resuelto!'}
                  </td>
                </tr>
              ) : (
                incidentes.map((incidente) => {
                  const nivel = nivelAntiguedad(incidente.dias_abierto);
                  return (
                    <tr key={incidente.id} className={nivel.fila}>
                      <td>
                        <Badge bg={nivel.badge} text={nivel.badge === 'warning' ? 'dark' : undefined}>
                          {textoDias(incidente.dias_abierto)}
                        </Badge>
                      </td>
                      <td>{new Date(incidente.fecha_hora).toLocaleString('es-AR')}</td>
                      <td>{etiquetaTipoIncidente(incidente.tipo)}</td>
                      <td className="text-break">{incidente.descripcion}</td>
                      <td>
                        {incidente.reportado_por.apellido}, {incidente.reportado_por.nombre}
                        <small className="d-block text-muted">DNI: {incidente.reportado_por_dni}</small>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>

        {totalPages > 1 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
            <span className="text-muted small mb-2 mb-md-0">
              Página {page} de {totalPages} ({total} incidentes)
            </span>
            <Pagination className="mb-0" size="sm">
              <Pagination.Prev onClick={() => setPage(page - 1)} disabled={page === 1} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((numero) => (
                <Pagination.Item key={numero} active={numero === page} onClick={() => setPage(numero)}>
                  {numero}
                </Pagination.Item>
              ))}
              <Pagination.Next onClick={() => setPage(page + 1)} disabled={page === totalPages} />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
}

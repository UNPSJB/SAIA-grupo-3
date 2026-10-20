import { ListPagination } from '../../../shared/components/ListPagination';
import { formatearFechaHora, textoAntiguedad } from '../../../shared/libreria/fechas';
import '../incidentes.css';
import { Badge, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { useIncidentesAbiertos } from './useIncidentesAbiertos';
import { textoBadge } from '../../../shared/libreria/etiquetas';

// Umbrales del resaltado: a partir de cuántos días abierto se pinta la fila
const DIAS_ALERTA = 7; // amarillo
const DIAS_CRITICO = 15; // rojo

function nivelAntiguedad(dias: number) {
  if (dias >= DIAS_CRITICO) return { fila: 'incidente-critico', badge: 'danger' };
  if (dias >= DIAS_ALERTA) return { fila: 'incidente-alerta', badge: 'warning' };
  return { fila: '', badge: 'secondary' };
}

export function IncidentesAbiertosPage() {
  const {
    incidentes,
    porTipo,
    loading,
    error,
    resumenLoading,
    resumenError,
    page,
    totalPages,
    total,
    setPage,
    tipoId,
    cambiarTipo,
    diasMinimos,
    cambiarDiasMinimos,
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
      {resumenError && <ErrorAlert mensaje={resumenError} />}

      {/* Indicador por tipo (E7). Click en una tarjeta = filtrar por ese tipo */}
      <Row className="g-3 mb-4" aria-busy={resumenLoading}>
        <Col xs={6} md>
          <Card className="h-100 shadow-sm border-0 text-center">
            <Card.Body className="py-3">
              <div className="small text-muted">Total abiertos</div>
              <div className="fs-3 fw-bold">
                {resumenLoading || resumenError ? '—' : totalAbiertos}
              </div>
            </Card.Body>
          </Card>
        </Col>
        {porTipo.map((p) => (
          <Col xs={6} md key={p.tipo.id}>
            <Card
              role="button"
              title={Number(tipoId) === p.tipo.id ? 'Quitar filtro' : 'Filtrar por este tipo'}
              onClick={() => cambiarTipo(Number(tipoId) === p.tipo.id ? '' : p.tipo.id)}
              className={`h-100 shadow-sm text-center tarjeta-tipo-incidente ${Number(tipoId) === p.tipo.id ? 'border-primary border-2' : 'border-0'}`}
            >
              <Card.Body className="py-3">
                <div className="small">
                  <Badge
                    bg={p.tipo.color}
                    text={['info', 'warning', 'light'].includes(p.tipo.color) ? 'dark' : undefined}
                  >
                    {p.tipo.nombre}
                  </Badge>
                </div>
                <div className="fs-3 fw-bold">{p.cantidad}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filtros + referencia de colores */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex flex-column gap-2" style={{ width: 220, maxWidth: '100%' }}>
          <Form.Select
            aria-label="Filtrar por tipo"
            value={tipoId}
            onChange={(e) => cambiarTipo(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ width: '220px', maxWidth: '100%' }}
          >
            <option value="">Todos los tipos</option>
            {porTipo.map((p) => (
              <option key={p.tipo.id} value={p.tipo.id}>
                {p.tipo.nombre}
              </option>
            ))}
          </Form.Select>
          <Form.Select
            aria-label="Filtrar por antigüedad"
            value={diasMinimos}
            onChange={(e) =>
              cambiarDiasMinimos(e.target.value === '' ? '' : Number(e.target.value))
            }
            style={{ width: '220px', maxWidth: '100%' }}
          >
            <option value="">Cualquier antigüedad</option>
            <option value={DIAS_ALERTA}>{DIAS_ALERTA} días o más</option>
            <option value={DIAS_CRITICO}>{DIAS_CRITICO} días o más</option>
          </Form.Select>
        </div>
        <div className="d-flex gap-2 small text-muted align-items-center">
          <Badge bg="secondary">Reciente</Badge>
          <Badge bg="warning" text="dark">
            {DIAS_ALERTA}+ días
          </Badge>
          <Badge bg="danger">{DIAS_CRITICO}+ días</Badge>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table hover responsive className="incidentes-abiertos mb-0 align-middle">
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
                    {tipoId || diasMinimos !== ''
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
                        <Badge
                          bg={nivel.badge}
                          text={nivel.badge === 'warning' ? 'dark' : undefined}
                        >
                          {textoAntiguedad(incidente.dias_abierto)}
                        </Badge>
                      </td>
                      <td>{formatearFechaHora(incidente.fecha_hora)}</td>
                      <td>
                        <Badge
                          bg={incidente.tipo.color}
                          text={textoBadge(incidente.tipo.color)}
                        >
                          {incidente.tipo.nombre}
                        </Badge>
                      </td>
                      <td className="text-break">{incidente.descripcion}</td>
                      <td>
                        {incidente.reportado_por.apellido}, {incidente.reportado_por.nombre}
                        <small className="d-block text-muted">
                          DNI: {incidente.reportado_por_dni}
                        </small>
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
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              changePage={setPage}
            />
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
}

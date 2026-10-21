import { ListPagination } from '../../../shared/components/ListPagination';
import { SortableHeader } from '../../../shared/components/SortableHeader';
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
    busqueda,
    setBusqueda,
    ordenarPor,
    orden,
    cambiarOrden,
  } = useIncidentesAbiertos();

  const totalAbiertos = porTipo.reduce((suma, p) => suma + p.cantidad, 0);

  return (
    <Container className="py-2">
      <h2 className="mb-1 border-bottom pb-2 text-secondary">Incidentes abiertos</h2>
      <p className="text-muted small mb-4">
        Incidentes sin acción correctiva registrada, del más antiguo al más reciente.
      </p>

      {error && <ErrorAlert mensaje={error} />}
      {resumenError && <ErrorAlert mensaje={resumenError} />}

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
                  <Badge bg={p.tipo.color} text={textoBadge(p.tipo.color)}>
                    {p.tipo.nombre}
                  </Badge>
                </div>
                <div className="fs-3 fw-bold">{p.cantidad}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2" style={{ flex: 1 }}>
          <Form.Control
            type="search"
            aria-label="Buscar incidente abierto"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '220px', maxWidth: '100%' }}
          />
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
          <Badge bg="warning">{DIAS_ALERTA}+ días</Badge>
          <Badge bg="danger">{DIAS_CRITICO}+ días</Badge>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading && incidentes.length === 0 ? (
            <LoadingSpinner mensaje="Cargando incidentes abiertos..." />
          ) : (
            <Table hover responsive className="incidentes-abiertos mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Antigüedad</th>
                  <SortableHeader
                    column="fecha_hora"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Reportado el
                  </SortableHeader>
                  <th>Tipo</th>
                  <SortableHeader
                    column="descripcion"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Descripción
                  </SortableHeader>
                  <SortableHeader
                    column="reportado_por_dni"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Reportado por
                  </SortableHeader>
                </tr>
              </thead>
              <tbody>
                {incidentes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      {tipoId || diasMinimos !== '' || busqueda
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
                          <Badge bg={nivel.badge}>{textoAntiguedad(incidente.dias_abierto)}</Badge>
                        </td>
                        <td>{formatearFechaHora(incidente.fecha_hora)}</td>
                        <td>
                          <Badge bg={incidente.tipo.color} text={textoBadge(incidente.tipo.color)}>
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
          )}
        </Card.Body>

        {totalPages > 0 && !loading && (
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
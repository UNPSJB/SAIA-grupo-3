import { Badge, Button, Card, Form, Pagination, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { API_BASE_URL } from '../../shared/libreria/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { useIncidente } from './useIncidente';
import type { EstadoIncidente, Incidente } from './types';
import { ESTADOS_INCIDENTE } from './types';

interface IncidenteListProps {
  onNuevoClick: () => void;
  onViewClick: (incidente: Incidente) => void;
  onEditarClick: (incidente: Incidente) => void;
  onEliminarClick: (incidente: Incidente) => void;
}

export function IncidenteList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: IncidenteListProps) {
  const { currentUser } = useAuth();
  const {
    incidentes,
    loading,
    error,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    changePage,
    estado,
    setEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    limpiarFiltros,
  } = useIncidente();

  const getEstado = (valor: EstadoIncidente) =>
    ESTADOS_INCIDENTE.find((e) => e.value === valor) ?? { label: valor, variante: 'secondary' };

  if (loading) {
    return <LoadingSpinner mensaje="Cargando incidentes..." />;
  }

  if (error) {
    return <ErrorAlert mensaje={error} />;
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Registro de Incidentes</h4>

        <Button
          variant="success"
          size="sm"
          onClick={onNuevoClick}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo Incidente</span>
        </Button>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Form.Select
          size="sm"
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoIncidente | '')}
          style={{ maxWidth: '170px' }}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_INCIDENTE.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </Form.Select>
        <Form.Control
          type="date"
          size="sm"
          aria-label="Filtrar desde fecha"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          style={{ maxWidth: '170px' }}
        />
        <Form.Control
          type="date"
          size="sm"
          aria-label="Filtrar hasta fecha"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          style={{ maxWidth: '170px' }}
        />
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={limpiarFiltros}
          disabled={!estado && !fechaDesde && !fechaHasta}
          className="d-flex align-items-center gap-1"
        >
          <i className="bi bi-x-lg"></i><span>Limpiar</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Fecha y hora</th>
                <th>Descripción</th>
                <th>Reportado por</th>
                <th>Foto</th>
                <th>Estado</th>
                <th className="text-center" style={{ width: '160px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {incidentes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    {estado || fechaDesde || fechaHasta
                      ? 'No hay incidentes para los filtros actuales.'
                      : 'No hay incidentes registrados.'}
                  </td>
                </tr>
              ) : (
                incidentes.map((incidente) => {
                  const infoEstado = getEstado(incidente.estado);
                  return (
                    <tr key={incidente.id}>
                    <td>{new Date(incidente.fecha_hora).toLocaleString()}</td>
                    <td className="text-break">{incidente.descripcion}</td>
                    <td>
                      <span>
                        {incidente.reportado_por.apellido},{' '}
                        {incidente.reportado_por.nombre}
                      </span>
                      <div>
                        <small className="text-muted">
                          DNI: {incidente.reportado_por_dni}
                        </small>
                      </div>
                    </td>
                    <td>
                      {incidente.imagen_path ? (
                        <a
                          href={`${API_BASE_URL}${incidente.imagen_path}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver foto
                        </a>
                      ) : (
                        <Badge bg="secondary">Sin foto</Badge>
                      )}
                    </td>
                    <td>
                      <Badge
                        bg={infoEstado.variante}
                        className={incidente.estado === 'abierto' ? 'text-dark' : ''}
                      >
                        {infoEstado.label}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-white py-1 px-2 shadow-sm"
                          title="Ver Detalle"
                          onClick={() => onViewClick(incidente)}
                        >
                          <i className="bi bi-eye-fill"></i>
                        </Button>
                        {currentUser?.administrar && (
                          <>
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Modificar"
                              onClick={() => onEditarClick(incidente)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              title="Eliminar"
                              onClick={() => onEliminarClick(incidente)}
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>

        {totalPages > 0 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
            <span className="text-muted small mb-2 mb-md-0">
              Mostrando página {page} de {totalPages} ({total} registros en
              total)
            </span>
            <Pagination className="mb-0" size="sm">
              <Pagination.Prev onClick={prevPage} disabled={page === 1} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (num) => (
                  <Pagination.Item
                    key={num}
                    active={num === page}
                    onClick={() => changePage(num)}
                  >
                    {num}
                  </Pagination.Item>
                )
              )}
              <Pagination.Next
                onClick={nextPage}
                disabled={page === totalPages}
              />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </>
  );
}

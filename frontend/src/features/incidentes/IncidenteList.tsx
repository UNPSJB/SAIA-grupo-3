import { ListPagination } from '../../shared/components/ListPagination';
import { formatearFecha } from '../../shared/libreria/fechas';
import './incidentes.css';
import { Badge, Button, Card, Form, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { API_BASE_URL } from '../../shared/libreria/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { useIncidente } from './useIncidente';
import type { EstadoIncidente, Incidente } from './types';
import { ESTADOS_INCIDENTE, COLORES_INCIDENTE, etiquetaTipoIncidente } from './types';

interface IncidenteListProps {
  onNuevoClick: () => void;
  onViewClick: (incidente: Incidente) => void;
  onEditarClick: (incidente: Incidente) => void;
  onEliminarClick: (incidente: Incidente) => void;
  onAccionCorrectivaClick: (incidente: Incidente) => void;
  onReabrirClick: (incidente: Incidente) => void;
}

export function IncidenteList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
  onAccionCorrectivaClick,
  onReabrirClick,
}: IncidenteListProps) {
  const { currentUser } = useAuth();
  const esAdministrador = currentUser?.administrar === true;
  const {
    incidentes,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    estado,
    setEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    limpiarFiltros,
    busqueda,
    setBusqueda,
  } = useIncidente();

  const getEstado = (valor: EstadoIncidente) =>
    ESTADOS_INCIDENTE.find((e) => e.value === valor) ?? { label: valor, variante: 'secondary' };

  return (
    <>
      <div className="mb-3">
        <h4 className="text-secondary fw-normal mb-3">
          {esAdministrador ? 'Registro de Incidentes' : 'Incidentes que reportaste'}
        </h4>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2" style={{ maxWidth: '100%' }}>
            <Form.Control
              type="search"
              aria-label="Buscar incidente"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '220px', maxWidth: '100%' }}
            />
            <Form.Select
              aria-label="Filtrar por estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoIncidente | '')}
              style={{ width: '170px', maxWidth: '100%' }}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_INCIDENTE.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Form.Select>
            <Form.Control
              type="date"
              aria-label="Filtrar desde fecha"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ width: '170px', maxWidth: '100%' }}
            />
            <Form.Control
              type="date"
              aria-label="Filtrar hasta fecha"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ width: '170px', maxWidth: '100%' }}
            />
            <Button
              variant="success"
              onClick={limpiarFiltros}
              disabled={!busqueda && !estado && !fechaDesde && !fechaHasta}
              className="d-flex align-items-center gap-1"
            >
              <i className="bi bi-x-lg"></i>
              <span>Limpiar</span>
            </Button>
          </div>
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 ms-auto">
            {currentUser?.operar && (
              <Button
                variant="success"
                onClick={onNuevoClick}
                className="d-flex align-items-center gap-1 shadow-sm"
              >
                <i className="bi bi-plus-lg"></i>
                <span>Nuevo Incidente</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorAlert mensaje={error} />}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading && incidentes.length === 0 ? (
            <LoadingSpinner mensaje="Cargando incidentes..." />
          ) : (
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Fecha y hora</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  {esAdministrador && <th>Reportado por</th>}
                  <th>Foto</th>
                  <th>Estado</th>
                  <th className="text-center" style={{ width: esAdministrador ? '200px' : '90px' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {incidentes.length === 0 ? (
                  <tr>
                    <td colSpan={esAdministrador ? 7 : 6} className="text-center py-4 text-muted">
                      {estado || fechaDesde || fechaHasta || busqueda
                        ? 'No hay incidentes para los filtros actuales.'
                        : esAdministrador
                          ? 'No hay incidentes registrados.'
                          : 'Todavía no reportaste incidentes.'}
                    </td>
                  </tr>
                ) : (
                  incidentes.map((incidente) => {
                    const infoEstado = getEstado(incidente.estado);
                    return (
                      <tr key={incidente.id}>
                        <td>{formatearFecha(incidente.fecha_hora)}</td>
                        <td>
                          <Badge
                            bg={COLORES_INCIDENTE[incidente.tipo]}
                            text={incidente.tipo === 'higiene' ? 'dark' : undefined}
                          >
                            {etiquetaTipoIncidente(incidente.tipo)}
                          </Badge>
                        </td>

                        <td className="text-break">{incidente.descripcion}</td>
                        {esAdministrador && (
                          <td>
                            <span>
                              {incidente.reportado_por.apellido}, {incidente.reportado_por.nombre}
                            </span>
                            <div>
                              <small className="text-muted">DNI: {incidente.reportado_por_dni}</small>
                            </div>
                          </td>
                        )}
                        <td>
                          {incidente.imagen_path ? (
                            <a
                              href={`${API_BASE_URL}${incidente.imagen_path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center gap-1 text-nowrap"
                              title="Ver foto"
                              aria-label="Ver foto del incidente (abre en otra pestaña)"
                            >
                              <i className="bi bi-image" aria-hidden="true"></i>
                              <span>Ver foto</span>
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
                                {incidente.estado === 'abierto' ? (
                                  <Button
                                    variant="success"
                                    size="sm"
                                    className="py-1 px-2 shadow-sm"
                                    title="Registrar acción correctiva y cerrar"
                                    onClick={() => onAccionCorrectivaClick(incidente)}
                                  >
                                    <i className="bi bi-clipboard-check-fill"></i>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="py-1 px-2 shadow-sm"
                                    title="Reabrir incidente"
                                    onClick={() => onReabrirClick(incidente)}
                                  >
                                    <i className="bi bi-arrow-counterclockwise"></i>
                                  </Button>
                                )}
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
          )}
        </Card.Body>

        {totalPages > 0 && !loading && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              changePage={changePage}
            />
          </Card.Footer>
        )}
      </Card>
    </>
  );
}
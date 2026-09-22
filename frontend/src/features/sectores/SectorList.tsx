import { Table, Card, Button, Badge, Pagination, Form, InputGroup } from 'react-bootstrap';
import { useSector } from './useSector';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Sector } from './types';

interface SectorListProps {
  onNuevoClick: () => void;
  onViewClick: (sector: Sector) => void;
  onEditarClick: (sector: Sector) => void;
  onEliminarClick: (sector: Sector) => void;
}

export function SectorList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: SectorListProps) {
  const {
    sectores,
    loading,
    error,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    changePage,
    mostrarInactivos,
    setMostrarInactivos,
    guardar,
    ordenarPor,
    orden,
    cambiarOrden,
    busqueda,
    setBusqueda
  } = useSector();

  const renderIconoOrden = (columna: string) => {
    if (ordenarPor !== columna) {
      return <i className="bi bi-chevron-expand text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
    }
    return orden === 'asc' 
      ? <i className="bi bi-chevron-up ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>
      : <i className="bi bi-chevron-down ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>;
  };

  if (loading && page === 1 && !busqueda) return <LoadingSpinner mensaje="Cargando sectores..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h4 className="text-secondary fw-normal mb-0 mt-md-2">Nómina de Sectores</h4>
        
        <div className="d-flex flex-wrap align-items-center gap-3">
          {/*
          <InputGroup size="sm" className="shadow-sm border-0" style={{ width: '250px' }}>
            <InputGroup.Text className="bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Buscar por nombre..."
              className="border-start-0 ps-0 shadow-none"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />z
          </InputGroup>
          */}
          <Form.Check 
            type="switch"
            id="switch-inactivos-sectores"
            label="Ver dados de baja"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="text-secondary mb-0"
          />

          <Button
            variant="success"
            size="sm"
            onClick={onNuevoClick}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Nuevo Sector</span>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none', width: '120px' }} onClick={() => cambiarOrden('id')}>
                  ID {renderIconoOrden('id')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('nombre')}>
                  Nombre del Sector {renderIconoOrden('nombre')}
                </th>
                <th>Estado</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sectores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    {busqueda 
                      ? `No se encontraron sectores para "${busqueda}".`
                      : "No hay sectores registrados para los filtros actuales."}
                  </td>
                </tr>
              ) : (
                sectores.map((s) => (
                  <tr key={s.id} className={!s.activo ? 'opacity-50' : ''}>
                    <td>
                      <Badge bg="secondary" className="font-monospace px-2 py-1">
                        #{s.id}
                      </Badge>
                    </td>
                    <td>
                      <strong>{s.nombre}</strong>
                    </td>
                    <td>
                      {s.activo ? (
                        <Badge bg="success">Activo</Badge>
                      ) : (
                        <Badge bg="danger">Inactivo</Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        {s.activo ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Ver Detalle"
                              onClick={() => onViewClick(s)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Modificar"
                              onClick={() => onEditarClick(s)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              title="Eliminar"
                              onClick={() => onEliminarClick(s)}
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            title="Reactivar Sector"
                            onClick={async () => {
                              if (confirm(`¿Reactivar el sector ${s.nombre}?`)) {
                                try {
                                  await guardar({ ...s, activo: true }, s.id);
                                } catch (err: unknown) {
                                  alert(err instanceof Error ? err.message : 'Error al reactivar el sector.');
                                }
                              }
                            }}
                          >
                            <i className="bi bi-arrow-counterclockwise me-1"></i> Reactivar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>

        {totalPages > 0 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
            <span className="text-muted small mb-2 mb-md-0">
              Mostrando página {page} de {totalPages} ({total} registros en total)
            </span>
            <Pagination className="mb-0" size="sm">
              <Pagination.Prev onClick={prevPage} disabled={page === 1} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <Pagination.Item
                  key={num}
                  active={num === page}
                  onClick={() => changePage(num)}
                >
                  {num}
                </Pagination.Item>
              ))}
              <Pagination.Next onClick={nextPage} disabled={page === totalPages} />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </>
  );
}
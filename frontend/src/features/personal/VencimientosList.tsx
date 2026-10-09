import { Table, Card, Button, Badge, Pagination, Form } from 'react-bootstrap';
import { useVencimientos } from './useVencimientos';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { EstadoVencimiento, Vencimiento } from './types';
import { ESTADOS_VENCIMIENTO } from './types';

interface VencimientosListProps {
  onVerLegajo: (vencimiento: Vencimiento) => void;
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function textoDias(dias: number): string {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Vence hoy';
  return `Faltan ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export function VencimientosList({ onVerLegajo }: VencimientosListProps) {
  const {
    vencimientos, loading, error, recargar,
    page, totalPages, total, nextPage, prevPage, changePage,
    estado, setEstado, busqueda, setBusqueda, limpiarFiltros,
    ordenarPor, orden, cambiarOrden,
  } = useVencimientos();

  const getEstado = (valor: EstadoVencimiento) =>
    ESTADOS_VENCIMIENTO.find((e) => e.value === valor) ?? { label: valor, variante: 'secondary' };

  const renderIconoOrden = (columna: string) => {
    if (ordenarPor !== columna) {
      return <i className="bi bi-chevron-expand text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
    }
    return orden === 'asc'
      ? <i className="bi bi-chevron-up ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>
      : <i className="bi bi-chevron-down ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>;
  };

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h4 className="text-secondary fw-normal mb-0 mt-md-2">Documentación del Personal</h4>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Form.Control
            type="search"
            size="sm"
            placeholder="Buscar empleado, DNI o documento..."
            aria-label="Buscar vencimiento"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: '260px' }}
          />
          <Form.Select
            size="sm"
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoVencimiento | '')}
            style={{ maxWidth: '170px' }}
          >
            <option value="">Todos los estados</option>
            {ESTADOS_VENCIMIENTO.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </Form.Select>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={limpiarFiltros}
            disabled={!estado && !busqueda}
            className="d-flex align-items-center gap-1"
          >
            <i className="bi bi-x-lg"></i><span>Limpiar</span>
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={recargar}
            disabled={loading}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-arrow-clockwise"></i><span>Actualizar</span>
          </Button>
        </div>
      </div>

      {error && <ErrorAlert mensaje={error} />}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading && vencimientos.length === 0 ? (
            <LoadingSpinner mensaje="Cargando estado de la documentación..." />
          ) : (
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('empleado')}>
                    Empleado {renderIconoOrden('empleado')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('tipo_documento')}>
                    Documento {renderIconoOrden('tipo_documento')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('fecha_vencimiento')}>
                    Vencimiento {renderIconoOrden('fecha_vencimiento')}
                  </th>
                  <th>Estado</th>
                  <th className="text-center" style={{ width: '150px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vencimientos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      {estado || busqueda
                        ? 'No hay documentos para los filtros actuales.'
                        : 'No hay documentación registrada en el sistema.'}
                    </td>
                  </tr>
                ) : (
                  vencimientos.map((v) => {
                    const infoEstado = getEstado(v.estado);
                    return (
                      <tr key={v.id}>
                        <td>
                          <strong>{v.personal.apellido}, {v.personal.nombre}</strong>
                          <br />
                          <small className="text-muted">
                            DNI: {v.personal.dni} · Legajo <Badge bg="secondary">#{v.personal.nroLegajo}</Badge>
                          </small>
                        </td>
                        <td>{v.tipo_documento.nombre}</td>
                        <td>
                          {formatearFecha(v.fecha_vencimiento)}
                          <br />
                          <small className="text-muted">{textoDias(v.dias_restantes)}</small>
                        </td>
                        <td>
                          <Badge
                            bg={infoEstado.variante}
                            className={v.estado === 'por_vencer' ? 'text-dark' : ''}
                          >
                            {infoEstado.label}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-white py-1 px-2 shadow-sm"
                            title="Ver legajo del empleado"
                            onClick={() => onVerLegajo(v)}
                          >
                            <i className="bi bi-person-vcard me-1"></i> Ir al legajo
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {totalPages > 0 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
            <span className="text-muted small mb-2 mb-md-0">
              Mostrando página {page} de {totalPages} ({total} registros en total)
            </span>
            <Pagination className="mb-0" size="sm">
              <Pagination.Prev onClick={prevPage} disabled={page === 1} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <Pagination.Item key={num} active={num === page} onClick={() => changePage(num)}>
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

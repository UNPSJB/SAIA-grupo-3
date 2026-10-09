import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
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
    vencimientos,
    loading,
    error,
    recargar,
    page,
    totalPages,
    total,
    changePage,
    estado,
    setEstado,
    busqueda,
    setBusqueda,
    limpiarFiltros,
    ordenarPor,
    orden,
    cambiarOrden,
  } = useVencimientos();

  const getEstado = (valor: EstadoVencimiento) =>
    ESTADOS_VENCIMIENTO.find((e) => e.value === valor) ?? { label: valor, variante: 'secondary' };

  return (
    <>
      <h4 className="text-secondary fw-normal mb-3">Documentación del Personal</h4>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
          <Form.Control
            type="search"
            placeholder="Buscar empleado, DNI o documento..."
            aria-label="Buscar vencimiento"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '320px', maxWidth: '100%' }}
          />
          <Form.Select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoVencimiento | '')}
            style={{ width: '220px', maxWidth: '100%' }}
          >
            <option value="">Todos los estados</option>
            {ESTADOS_VENCIMIENTO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Form.Select>
          <Button
            variant="success"
            onClick={limpiarFiltros}
            disabled={!estado && !busqueda}
            className="d-flex align-items-center gap-1"
          >
            <i className="bi bi-x-lg"></i>
            <span>Limpiar</span>
          </Button>
        </div>
        <Button
          variant="success"
          onClick={recargar}
          disabled={loading}
          className="d-flex align-items-center gap-1 shadow-sm flex-shrink-0 ms-auto"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Actualizar</span>
        </Button>
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
                  <SortableHeader
                    column="empleado"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Empleado
                  </SortableHeader>
                  <SortableHeader
                    column="tipo_documento"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Documento
                  </SortableHeader>
                  <SortableHeader
                    column="fecha_vencimiento"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Vencimiento
                  </SortableHeader>
                  <th>Estado</th>
                  <th className="text-center" style={{ width: '150px' }}>
                    Acciones
                  </th>
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
                          <strong>
                            {v.personal.apellido}, {v.personal.nombre}
                          </strong>
                          <br />
                          <small className="text-muted">
                            DNI: {v.personal.dni} · Legajo{' '}
                            <Badge bg="secondary">#{v.personal.nroLegajo}</Badge>
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
                            variant="success"
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

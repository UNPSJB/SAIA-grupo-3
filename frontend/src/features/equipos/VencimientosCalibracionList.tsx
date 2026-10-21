import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { useVencimientosCalibracion } from './useVencimientosCalibracion';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import type { EstadoVencimientoCalibracion, VencimientoCalibracion } from './types';
import { ESTADOS_VENCIMIENTO_CALIBRACION, TIPOS_EQUIPOS } from './types';
import { formatearFecha, textoDiasRestantes } from '../../shared/libreria/fechas';
import { etiquetaDe } from '../../shared/libreria/etiquetas';

interface VencimientosCalibracionListProps {
  onVerEquipo: (vencimiento: VencimientoCalibracion) => void;
}

export function VencimientosCalibracionList({ onVerEquipo }: VencimientosCalibracionListProps) {
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
  } = useVencimientosCalibracion();

  const getEstado = (valor: EstadoVencimientoCalibracion) =>
    ESTADOS_VENCIMIENTO_CALIBRACION.find((e) => e.value === valor) ?? {
      label: valor,
      variante: 'secondary',
    };

  const getTipo = (valor: string) => etiquetaDe(TIPOS_EQUIPOS, valor);

  return (
    <>
      <h4 className="text-secondary fw-normal mb-3">Calibración de Equipos e Instrumentos</h4>

      <ListControls busqueda={busqueda} setBusqueda={setBusqueda}>
        <Form.Select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoVencimientoCalibracion | '')}
          style={{ width: '220px', maxWidth: '100%' }}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_VENCIMIENTO_CALIBRACION.map((e) => (
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
        <Button
          variant="success"
          onClick={() => recargar()}
          disabled={loading}
          className="d-flex align-items-center gap-1 shadow-sm ms-auto"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Actualizar</span>
        </Button>
      </ListControls>

      {error && <ErrorAlert mensaje={error} />}

      <Card className="shadow-sm border-0 mt-3">
        <Card.Body className="p-0">
          {loading && vencimientos.length === 0 ? (
            <LoadingSpinner mensaje="Cargando estado de las calibraciones..." />
          ) : (
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <SortableHeader
                    column="equipo"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Equipo
                  </SortableHeader>
                  <SortableHeader
                    column="sector"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Sector
                  </SortableHeader>
                  <th>Última calibración</th>
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
                    <td colSpan={6} className="text-center py-4 text-muted">
                      {estado || busqueda
                        ? 'No hay equipos para los filtros actuales.'
                        : 'No hay equipos con calibración y periodicidad registradas.'}
                    </td>
                  </tr>
                ) : (
                  vencimientos.map((v) => {
                    const infoEstado = getEstado(v.estado);
                    return (
                      <tr key={v.id}>
                        <td>
                          <strong>{v.equipo.nombre}</strong>
                          <br />
                          <small className="text-muted">
                            N° de serie:{' '}
                            <span className="font-monospace">{v.equipo.numero_serie}</span>
                            {' · '}
                            <Badge bg="secondary">{getTipo(v.equipo.tipo)}</Badge>
                          </small>
                        </td>
                        <td>
                          {v.sector ? v.sector.nombre : <span className="text-muted">Sin sector</span>}
                        </td>
                        <td>
                          {formatearFecha(v.fecha_ultima_calibracion)}
                          <br />
                          <small className="text-muted">Cada {v.periodicidad_dias} días</small>
                        </td>
                        <td>
                          {formatearFecha(v.fecha_vencimiento)}
                          <br />
                          <small className="text-muted">{textoDiasRestantes(v.dias_restantes)}</small>
                        </td>
                        <td>
                          <Badge bg={infoEstado.variante}>{infoEstado.label}</Badge>
                        </td>
                        <td className="text-center">
                          <Button
                            variant="success"
                            size="sm"
                            className="text-white py-1 px-2 shadow-sm"
                            title="Ver detalle y calibraciones del equipo"
                            onClick={() => onVerEquipo(v)}
                          >
                            <i className="bi bi-tools me-1"></i> Ir al equipo
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
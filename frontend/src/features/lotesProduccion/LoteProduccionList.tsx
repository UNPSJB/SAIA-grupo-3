import { Badge, Button, Card, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { useAuth } from '../../shared/hooks/useAuth';
import { formatearFecha } from '../../shared/libreria/fechas';
import { formatearCantidad } from './formato';
import type { LoteProduccion } from './types';
import { useLotesProduccion } from './useLotesProduccion';

interface LoteProduccionListProps {
  onNuevoClick: () => void;
  onViewClick: (lote: LoteProduccion) => void;
}

export function LoteProduccionList({ onNuevoClick, onViewClick }: LoteProduccionListProps) {
  const { currentUser } = useAuth();
  const esAdministrador = currentUser?.administrar === true;
  const {
    lotes,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    ordenarPor,
    orden,
    cambiarOrden,
    busqueda,
    setBusqueda,
  } = useLotesProduccion();

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando lotes..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        title={esAdministrador ? 'Lotes producidos' : 'Lotes que registraste'}
      >
        {currentUser?.operar && (
          <Button
            variant="success"
            onClick={onNuevoClick}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Registrar Lote</span>
          </Button>
        )}
      </ListControls>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-theme">
              <tr>
                <SortableHeader
                  column="codigo"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Lote
                </SortableHeader>
                <SortableHeader
                  column="producto"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Producto
                </SortableHeader>
                <SortableHeader
                  column="fecha_produccion"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Fecha de producción
                </SortableHeader>
                <SortableHeader
                  column="cantidad"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Cantidad
                </SortableHeader>
                {esAdministrador && <th>Registrado por</th>}
                <th className="text-center" style={{ width: '90px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {lotes.length === 0 ? (
                <tr>
                  <td colSpan={esAdministrador ? 6 : 5} className="text-center py-4 text-muted">
                    {busqueda
                      ? 'No hay lotes para la búsqueda.'
                      : 'Todavía no hay lotes registrados.'}
                  </td>
                </tr>
              ) : (
                lotes.map((lote) => (
                  <tr key={lote.id}>
                    <td>
                      <Badge bg="secondary" className="font-monospace">
                        {lote.codigo}
                      </Badge>
                    </td>
                    <td>
                      <strong>{lote.producto.nombre}</strong>
                    </td>
                    <td>{formatearFecha(lote.fecha_produccion)}</td>
                    <td className="text-nowrap">
                      {formatearCantidad(lote.cantidad)} {lote.producto.unidad_medida.sufijo}
                    </td>
                    {esAdministrador && (
                      <td>
                        {lote.registrado_por.apellido}, {lote.registrado_por.nombre}
                      </td>
                    )}
                    <td className="text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-white py-1 px-2 shadow-sm"
                        title="Ver detalle"
                        onClick={() => onViewClick(lote)}
                      >
                        <i className="bi bi-eye-fill"></i>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
        {totalPages > 0 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-body border-top">
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

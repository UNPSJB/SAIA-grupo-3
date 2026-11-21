import { useEffect, useState } from 'react';
import { Badge, Button, Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { getProductoById } from './productoApi';
import type { Producto } from './types';

interface ProductoRecetaTabProps {
  producto: Producto;
  onVolver: () => void;
}

function formatearCantidad(valor: number): string {
  return Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 4 });
}

export function ProductoRecetaTab({ producto, onVolver }: ProductoRecetaTabProps) {
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState<Producto>(producto);
  const [cargando, setCargando] = useState(producto.receta === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetalle(producto);
    if (producto.receta !== undefined) {
      setCargando(false);
      setError(null);
      return;
    }

    let activo = true;
    setCargando(true);
    setError(null);

    getProductoById(producto.id)
      .then((datos) => {
        if (activo) setDetalle(datos);
      })
      .catch((err: unknown) => {
        if (activo) {
          setError(
            err instanceof Error ? err.message : 'No se pudo cargar la receta del producto.',
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [producto]);

  const receta = detalle.receta;
  const insumos = receta?.insumos ?? [];

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '720px' }}>
      <Card.Header className="bg-body-tertiary text-secondary d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-journal-text fs-5"></i>
          <h5 className="mb-0">Receta — {detalle.nombre}</h5>
        </div>
        {receta && insumos.length > 0 && (
          <Badge bg="success">Versión {receta.version_numero} vigente</Badge>
        )}
      </Card.Header>

      <Card.Body className="p-4">
        {cargando && <LoadingSpinner mensaje="Cargando receta..." />}
        {error && <ErrorAlert mensaje={error} />}

        {!cargando && !error && (!receta || insumos.length === 0) && (
          <div className="bg-body-tertiary p-3 rounded border text-muted">
            Este producto no tiene receta configurada: todavía no hay insumos asignados.
          </div>
        )}

        {!cargando && !error && receta && insumos.length > 0 && (
          <div className="border rounded overflow-hidden">
            <div className="bg-body-tertiary px-3 py-2 border-bottom small text-body-secondary">
              Proporciones definidas para:{' '}
              <strong className="text-body">
                {formatearCantidad(receta.rendimiento_cantidad)} {receta.rendimiento_unidad.sufijo}
              </strong>
            </div>
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-theme">
                <tr>
                  <th>Insumo</th>
                  <th className="text-end">Cantidad requerida</th>
                  <th>Unidad de medida</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map((insumo) => (
                  <tr key={insumo.insumo_id}>
                    <td>{insumo.insumo_nombre}</td>
                    <td className="text-end">{formatearCantidad(insumo.cantidad_requerida)}</td>
                    <td>{insumo.unidad_medida.sufijo}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>

      <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        {receta && (
          <Button
            variant="primary"
            className="d-flex align-items-center gap-2"
            onClick={() => navigate(`/recetas/${receta.receta_id}`)}
          >
            <i className="bi bi-box-arrow-up-right"></i>
            <span>Ir a la receta</span>
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
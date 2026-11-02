import { useEffect, useState } from 'react';
import { Card, Table } from 'react-bootstrap';
import { useAuth } from '../../shared/hooks/useAuth';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatearFecha } from '../../shared/libreria/fechas';
import { getTrazabilidadProduccion } from './trazabilidadApi';
import type { TrazabilidadProduccion } from './trazabilidadTypes';

interface TrazabilidadProduccionDetalleProps {
  loteId: number;
}

type ResultadoTrazabilidad =
  | { loteId: number; datos: TrazabilidadProduccion; error: null }
  | { loteId: number; datos: null; error: string };

export function TrazabilidadProduccionDetalle({
  loteId,
}: TrazabilidadProduccionDetalleProps) {
  const { currentUser } = useAuth();
  const [resultado, setResultado] = useState<ResultadoTrazabilidad | null>(null);

  useEffect(() => {
    if (!currentUser?.administrar) return;
    let activo = true;
    getTrazabilidadProduccion(loteId)
      .then((datos) => {
        if (activo) setResultado({ loteId, datos, error: null });
      })
      .catch((err: unknown) => {
        if (activo)
          setResultado({
            loteId,
            datos: null,
            error:
              err instanceof Error
                ? err.message
                : 'No se pudo cargar la trazabilidad del lote.',
          });
      });
    return () => {
      activo = false;
    };
  }, [currentUser?.administrar, loteId]);

  if (!currentUser?.administrar) return null;

  const resultadoActual = resultado?.loteId === loteId ? resultado : null;
  const loading = resultadoActual === null;
  const error = resultadoActual?.error ?? null;
  const trazabilidad = resultadoActual?.datos ?? null;

  return (
    <Card className="shadow-sm border-0 mt-4">
      <Card.Header className="bg-body-tertiary text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-upc-scan fs-5" aria-hidden="true"></i>
        <h5 className="mb-0">Trazabilidad de insumos utilizados</h5>
      </Card.Header>
      <Card.Body>
        {error && <ErrorAlert mensaje={error} />}
        {loading && <LoadingSpinner mensaje="Cargando trazabilidad..." />}
        {!loading && trazabilidad?.insumos.length === 0 && (
          <p className="text-muted mb-0">Este lote no tiene insumos asociados.</p>
        )}
        {!loading && trazabilidad && trazabilidad.insumos.length > 0 && (
          <Table striped hover responsive className="align-middle mb-0">
            <thead className="table-theme">
              <tr>
                <th>Insumo</th>
                <th>Lote de proveedor</th>
                <th>Proveedor</th>
                <th>Recepción / vencimiento</th>
                <th className="text-end">Cantidad usada</th>
              </tr>
            </thead>
            <tbody>
              {trazabilidad.insumos.flatMap((insumo) => {
                const filas = insumo.lotes_recepcion.map((lote) => (
                  <tr key={`${insumo.insumo_id}-${lote.lote_recepcion_id}`}>
                    <td>{insumo.insumo_nombre}</td>
                    <td>{lote.numero_lote}</td>
                    <td>{lote.proveedor_nombre}</td>
                    <td>
                      {formatearFecha(lote.fecha_recepcion)} /{' '}
                      {formatearFecha(lote.fecha_vencimiento)}
                    </td>
                    <td className="text-end">
                      {lote.cantidad_utilizada.toLocaleString('es-AR')} {insumo.unidad}
                    </td>
                  </tr>
                ));
                if (insumo.cantidad_stock_anterior > 0) {
                  filas.push(
                    <tr key={`${insumo.insumo_id}-stock-anterior`}>
                      <td>{insumo.insumo_nombre}</td>
                      <td colSpan={3} className="text-muted">
                        Stock anterior sin lote identificado
                      </td>
                      <td className="text-end">
                        {insumo.cantidad_stock_anterior.toLocaleString('es-AR')} {insumo.unidad}
                      </td>
                    </tr>,
                  );
                }
                if (insumo.cantidad_historica_sin_origen > 0) {
                  filas.push(
                    <tr key={`${insumo.insumo_id}-historico`}>
                      <td>{insumo.insumo_nombre}</td>
                      <td colSpan={3} className="text-muted">
                        Registro histórico sin lote de recepción
                      </td>
                      <td className="text-end">
                        {insumo.cantidad_historica_sin_origen.toLocaleString('es-AR')}{' '}
                        {insumo.unidad}
                      </td>
                    </tr>,
                  );
                }
                return filas;
              })}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

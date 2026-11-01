import { useCallback, useState } from 'react';
import { Alert, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ListPagination } from '../../shared/components/ListPagination';
import { formatearFecha } from '../../shared/libreria/fechas';
import { listarLotes, obtenerStock } from './abastecimientoApi';
import { useConsulta } from './useConsulta';

export function LotesDeInsumo({ insumoId }: { insumoId: number }) {
  const [page, setPage] = useState(1);
  const cargarLotes = useCallback(
    (signal: AbortSignal) => listarLotes({ insumo_id: insumoId, page }, signal),
    [insumoId, page],
  );
  const cargarStock = useCallback(
    (signal: AbortSignal) => obtenerStock(insumoId, signal),
    [insumoId],
  );
  const lotes = useConsulta(cargarLotes);
  const stock = useConsulta(cargarStock);
  return (
    <section className="mt-4" aria-label="Lotes del insumo">
      <h5>Lotes recibidos</h5>
      {(lotes.error || stock.error) && <Alert variant="danger">{lotes.error || stock.error}</Alert>}
      {stock.datos && (
        <div className="bg-body-tertiary border rounded p-3 mb-3">
          <div>
            Stock total: <strong>{stock.datos.stock_total}</strong>
          </div>
          <div>Identificado por lote: {stock.datos.stock_identificado}</div>
          <div>Sin lote identificado: {stock.datos.stock_sin_lote}</div>
          <div>Saldo de lotes sin vencer: {stock.datos.stock_utilizable}</div>
          <div>Saldo vencido: {stock.datos.stock_vencido}</div>
          <small className="text-body-secondary">
            Cantidades expresadas en la unidad del insumo.
          </small>
        </div>
      )}
      {lotes.cargando && <p role="status">Cargando lotes...</p>}
      {lotes.datos && (
        <>
          <Table responsive size="sm">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Proveedor</th>
                <th>Disponible</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>
              {lotes.datos.items.map((lote) => (
                <tr key={lote.id}>
                  <td>{lote.numero_lote}</td>
                  <td>{lote.proveedor_nombre}</td>
                  <td>
                    {lote.cantidad_disponible} {lote.unidad}
                  </td>
                  <td>{formatearFecha(lote.fecha_vencimiento)}</td>
                </tr>
              ))}
              {!lotes.datos.items.length && (
                <tr>
                  <td colSpan={4}>No tiene recepciones activas.</td>
                </tr>
              )}
            </tbody>
          </Table>
          <ListPagination
            page={page}
            totalPages={lotes.datos.pages}
            total={lotes.datos.total}
            changePage={setPage}
          />
        </>
      )}
      <Link
        className="btn btn-outline-primary mt-3"
        to={`/recepciones-insumos?insumo_id=${insumoId}`}
      >
        Administrar sus recepciones
      </Link>
    </section>
  );
}

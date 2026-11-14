import { Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { InsigniaFuente } from './InsigniaFuente';
import { getHistorialNutricional } from './nutricionApi';
import { formatearValor } from './formato';
import type { MovimientoHistorial } from './types';

const ACCIONES: Record<MovimientoHistorial['accion'], string> = {
  copia_referencia: 'Copia de la base',
  carga_manual: 'Carga manual',
  modificacion: 'Modificación',
  borrado: 'Borrado',
};

export function HistorialNutricional({
  insumoId,
  revision,
}: {
  insumoId: number;
  revision: number;
}) {
  const historial = useConsulta(() => getHistorialNutricional(insumoId), [insumoId, revision]);

  if (historial.error) return <ErrorAlert mensaje={historial.error} />;
  if (!historial.datos) return <LoadingSpinner mensaje="Cargando historial..." />;
  if (historial.datos.length === 0)
    return <p className="text-body-secondary small mb-0">Todavía no hay cambios registrados.</p>;

  return (
    <Table size="sm" responsive hover className="mb-0 small align-middle">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Nutriente</th>
          <th>Acción</th>
          <th className="text-end">Antes</th>
          <th className="text-end">Después</th>
          <th>Fuente</th>
          <th>Persona</th>
        </tr>
      </thead>
      <tbody>
        {historial.datos.map((movimiento) => (
          <tr key={movimiento.id}>
            <td className="text-nowrap">{formatearFechaHora(movimiento.fecha_hora)}</td>
            <td>{movimiento.etiqueta}</td>
            <td>{ACCIONES[movimiento.accion]}</td>
            <td className="text-end">{formatearValor(movimiento.valor_anterior)}</td>
            <td className="text-end">{formatearValor(movimiento.valor_nuevo)}</td>
            <td>
              {movimiento.fuente && <InsigniaFuente fuente={movimiento.fuente} />}
              {movimiento.detalle_fuente && (
                <div className="text-body-secondary">{movimiento.detalle_fuente}</div>
              )}
            </td>
            <td className="text-nowrap">
              {movimiento.personal.nombre} {movimiento.personal.apellido}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

import { useConsulta } from '../../../shared/hooks/useConsulta';
import { useRecargaAutomatica } from '../../../shared/hooks/useRecargaAutomatica';
import type { RangoFechas } from '../../../shared/libreria/fechas';
import { getEstadisticasIncidentes } from '../incidenteApi';
import { INCIDENTES_ACTUALIZADOS } from '../eventos';

/** Cada cuánto se refrescan solas las estadísticas (incidentes de otros usuarios). */
const INTERVALO_RECARGA_MS = 60_000;

export function useEstadisticasIncidentes(rango: RangoFechas) {
  const consulta = useConsulta(
    () => getEstadisticasIncidentes(rango.desde, rango.hasta),
    [rango.desde, rango.hasta],
  );
  useRecargaAutomatica(consulta.recargar, {
    eventos: [INCIDENTES_ACTUALIZADOS],
    intervaloMs: INTERVALO_RECARGA_MS,
  });
  return consulta;
}

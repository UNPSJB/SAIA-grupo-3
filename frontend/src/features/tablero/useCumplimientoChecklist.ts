import { useConsulta } from '../../shared/hooks/useConsulta';
import type { RangoFechas } from '../../shared/libreria/fechas';
import type { AgrupacionCumplimiento } from './types';
import { getCumplimientoChecklist } from './tableroApi';

export function useCumplimientoChecklist(rango: RangoFechas, agrupacion: AgrupacionCumplimiento) {
  return useConsulta(
    () => getCumplimientoChecklist(rango.desde, rango.hasta, agrupacion),
    [rango.desde, rango.hasta, agrupacion],
  );
}

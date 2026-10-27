import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { rangoUltimosDias, type RangoFechas } from '../libreria/fechas';


export function useRangoFechasUrl(prefijo: string, diasPorDefecto = 30) {
  const [params, setParams] = useSearchParams();
  const claveDesde = `${prefijo}_desde`;
  const claveHasta = `${prefijo}_hasta`;
  const porDefecto = rangoUltimosDias(diasPorDefecto);
  const rango: RangoFechas = {
    desde: params.get(claveDesde) || porDefecto.desde,
    hasta: params.get(claveHasta) || porDefecto.hasta,
  };

  const setRango = useCallback(
    (nuevo: RangoFechas) =>
      setParams(
        (anterior) => {
          const siguiente = new URLSearchParams(anterior);
          siguiente.set(claveDesde, nuevo.desde);
          siguiente.set(claveHasta, nuevo.hasta);
          return siguiente;
        },
        { replace: true },
      ),
    [setParams, claveDesde, claveHasta],
  );

  return { rango, setRango };
}

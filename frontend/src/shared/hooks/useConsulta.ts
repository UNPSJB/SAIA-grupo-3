import { useCallback, useEffect, useRef, useState } from 'react';

interface Resultado<T> {
  clave: string | null;
  datos: T | null;
  error: string | null;
}

/**
 * Pide datos al backend y los vuelve a pedir cuando cambian los parámetros.
 *
 * - `parametros`: lo que define la consulta (ej. el período). Si cambia, recarga.
 * - Al recargar conserva los datos anteriores (`cargando` queda en true), así la
 *   pantalla no parpadea: el gráfico se muestra atenuado hasta que llegan los nuevos.
 */
export function useConsulta<T>(cargar: () => Promise<T>, parametros: unknown[]) {
  const cargarActual = useRef(cargar);
  useEffect(() => {
    cargarActual.current = cargar;
  });

  const [revision, setRevision] = useState(0);
  const clave = `${JSON.stringify(parametros)}#${revision}`;
  const [resultado, setResultado] = useState<Resultado<T>>({
    clave: null,
    datos: null,
    error: null,
  });

  useEffect(() => {
    let activo = true;
    cargarActual
      .current()
      .then((datos) => {
        if (activo) setResultado({ clave, datos, error: null });
      })
      .catch((err: unknown) => {
        if (activo) {
          const mensaje = err instanceof Error ? err.message : 'No se pudieron cargar los datos.';
          setResultado((anterior) => ({ clave, datos: anterior.datos, error: mensaje }));
        }
      });
    return () => {
      activo = false;
    };
  }, [clave]);

  const recargar = useCallback(() => setRevision((valor) => valor + 1), []);

  return {
    datos: resultado.datos,
    error: resultado.error,
    cargando: resultado.clave !== clave,
    recargar,
  };
}

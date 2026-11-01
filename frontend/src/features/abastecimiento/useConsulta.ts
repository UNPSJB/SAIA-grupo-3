import { useEffect, useState } from 'react';

interface Resultado<T> {
  fuente: unknown;
  revision: number;
  datos: T | null;
  error: string | null;
}

export function useConsulta<T>(cargar: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function ejecutar() {
      try {
        const datos = await cargar(controller.signal);
        if (!controller.signal.aborted)
          setResultado({ fuente: cargar, revision, datos, error: null });
      } catch (error) {
        if (!controller.signal.aborted)
          setResultado({
            fuente: cargar,
            revision,
            datos: null,
            error: error instanceof Error ? error.message : 'No se pudieron cargar los datos.',
          });
      }
    }
    void ejecutar();
    return () => controller.abort();
  }, [cargar, revision]);

  const vigente = resultado?.fuente === cargar && resultado.revision === revision;
  return {
    datos: vigente ? resultado.datos : null,
    error: vigente ? resultado.error : null,
    cargando: !vigente,
    recargar: () => setRevision((valor) => valor + 1),
  };
}

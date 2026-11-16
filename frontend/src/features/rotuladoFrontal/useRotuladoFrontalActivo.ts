import { useConsulta } from '../../shared/hooks/useConsulta';
import { getEstadoRotulado } from './rotuladoApi';

export function useRotuladoFrontalActivo(consultar = true): boolean {
  const estado = useConsulta(
    () => (consultar ? getEstadoRotulado() : Promise.resolve({ activo: false })),
    [consultar],
  );
  return estado.datos?.activo === true;
}

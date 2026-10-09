import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import type { DocumentoTecnicoResumen, TipoDocumentoTecnico } from './types';

export function useDocumentosTecnicos() {
  const [params] = useSearchParams();
  const tipo = (params.get('tipo') || '') as TipoDocumentoTecnico | '';
  const list = usePagedList<DocumentoTecnicoResumen>(
    'documentos-tecnicos/',
    true,
    tipo ? `&tipo=${encodeURIComponent(tipo)}` : '',
    'nombre',
  );
  return {
    ...list,
    documentos: list.items,
    tipo,
    cambiarTipo: (valor: TipoDocumentoTecnico | '') => list.update({ tipo: valor }),
    cambiarBusqueda: list.setBusqueda,
  };
}

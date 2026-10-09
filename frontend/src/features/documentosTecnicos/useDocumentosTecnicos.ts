import { useEffect, useState } from 'react';
import { getDocumentosTecnicos } from './documentoTecnicoApi';
import type { DocumentoTecnicoResumen, TipoDocumentoTecnico } from './types';

const TAMANIO_PAGINA = 10;

export function useDocumentosTecnicos() {
  const [documentos, setDocumentos] = useState<DocumentoTecnicoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // filtros
  const [tipo, setTipo] = useState<TipoDocumentoTecnico | ''>('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let componenteActivo = true;
    getDocumentosTecnicos(page, TAMANIO_PAGINA, tipo, busqueda)
      .then((data) => {
        if (!componenteActivo) return;
        setDocumentos(data.items);
        setTotal(data.total);
        setTotalPages(data.pages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (componenteActivo) {
          setError(err instanceof Error ? err.message : 'Error al cargar los documentos.');
        }
      })
      .finally(() => {
        if (componenteActivo) setLoading(false);
      });

    return () => {
      componenteActivo = false;
    };
  }, [page, tipo, busqueda]);

  // Al cambiar un filtro se vuelve a la página 1
  const cambiarTipo = (valor: TipoDocumentoTecnico | '') => { setTipo(valor); setPage(1); };
  const cambiarBusqueda = (valor: string) => { setBusqueda(valor); setPage(1); };

  return {
    documentos, loading, error,
    page, totalPages, total, setPage,
    tipo, cambiarTipo, busqueda, cambiarBusqueda,
  };
}

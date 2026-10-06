import { useCallback, useEffect, useState } from 'react';
import {
  createTipoDocumento,
  deleteTipoDocumento,
  getTiposDocumento,
  updateTipoDocumento,
} from './tipoDocumentoApi';
import type { TipoDocumento, TipoDocumentoDatos } from './types';

export function useTipoDocumento() {
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState('id');
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');
  const [busqueda, setBusqueda] = useState('');

  const actualizarListado = useCallback((data: Awaited<ReturnType<typeof getTiposDocumento>>) => {
    setTiposDocumento(data.items);
    setTotalPages(data.pages);
    setTotal(data.total);
    setPage(data.page);
    setError(null);
  }, []);

  useEffect(() => {
    let componenteActivo = true;
    getTiposDocumento(page, size, mostrarInactivos, ordenarPor, orden, busqueda)
      .then((data) => {
        if (componenteActivo) actualizarListado(data);
      })
      .catch((err: unknown) => {
        if (componenteActivo) {
          setError(err instanceof Error ? err.message : 'Error al cargar los tipos de documento.');
        }
      })
      .finally(() => {
        if (componenteActivo) setLoading(false);
      });

    return () => {
      componenteActivo = false;
    };
  }, [page, size, mostrarInactivos, ordenarPor, orden, busqueda, actualizarListado]);

  const cargarTiposDocumento = async () => {
    setLoading(true);
    try {
      const data = await getTiposDocumento(
        page, size, mostrarInactivos, ordenarPor, orden, busqueda
      );
      actualizarListado(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los tipos de documento.');
    } finally {
      setLoading(false);
    }
  };

  const cambiarOrden = (columna: string) => {
    if (ordenarPor === columna) {
      setOrden(orden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(columna);
      setOrden('asc');
    }
  };

  const guardar = async (datos: TipoDocumentoDatos, idExistente?: number) => {
    if (idExistente) {
      await updateTipoDocumento(idExistente, datos);
    } else {
      if (!datos.nombre) throw new Error('El nombre del tipo de documento es obligatorio.');
      await createTipoDocumento({ nombre: datos.nombre });
    }
    await cargarTiposDocumento();
  };

  const eliminar = async (id: number) => {
    await deleteTipoDocumento(id);
    await cargarTiposDocumento();
  };

  const nextPage = () => {
    if (page < totalPages) setPage((actual) => actual + 1);
  };
  const prevPage = () => {
    if (page > 1) setPage((actual) => actual - 1);
  };
  const changePage = (newPage: number) => setPage(newPage);

  return {
    tiposDocumento, loading, error, guardar, eliminar, cargarTiposDocumento,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos, ordenarPor, orden, cambiarOrden,
    busqueda, setBusqueda, setPage,
  };
}

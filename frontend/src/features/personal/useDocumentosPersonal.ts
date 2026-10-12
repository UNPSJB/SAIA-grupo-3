import { avisarCambioNotificaciones } from '../notificaciones/events';
import { useCallback, useEffect, useState } from 'react';
import {
  createDocumento,
  deleteDocumento,
  getDocumentosPersonal,
  updateDocumento,
  type DocumentoDatos,
} from './documentacionApi';
import { getTiposDocumento } from '../tipoDocumento/tipoDocumentoApi';
import type { Documento, TipoDocumento } from './types';

export function useDocumentosPersonal(personalId: number) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [datos, tipos] = await Promise.all([
        getDocumentosPersonal(personalId),
        getTiposDocumento(1, 100),
      ]);
      setDocumentos(datos);
      setTiposDocumento(tipos.items.filter((tipo) => tipo.activo));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los documentos.');
    } finally {
      setLoading(false);
    }
  }, [personalId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (datos: DocumentoDatos, idExistente?: number) => {
    if (idExistente !== undefined) {
      await updateDocumento(idExistente, datos);
    } else {
      await createDocumento(personalId, datos);
    }
    avisarCambioNotificaciones();
    await cargar();
  };

  const eliminar = async (id: number) => {
    await deleteDocumento(id);
    avisarCambioNotificaciones();
    await cargar();
  };

  return {
    documentos,
    tiposDocumento,
    loading,
    error,
    cargar,
    guardar,
    eliminar,
  };
}

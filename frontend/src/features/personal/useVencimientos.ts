import { useState, useEffect, useCallback } from 'react';
import { getAllDocumentos } from './documentacionApi';
import { getPersonal } from './personalApi';
import type { Documento, Personal } from './types';

export interface DocumentoConPersonal extends Documento {
  empleado?: Personal;
}

export function useVencimientos() {
  const [vencimientos, setVencimientos] = useState<DocumentoConPersonal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      // Obtenemos documentos y personal en paralelo
      const [docsData, personalData] = await Promise.all([
        getAllDocumentos(),
        getPersonal(1, 1000) 
      ]);

      
      const docsCombinados = docsData.map(doc => ({
        ...doc,
        empleado: personalData.items.find(p => p.dni === doc.personal_id)
      }));

      
      docsCombinados.sort((a, b) => {
        if (!a.fecha_vencimiento) return 1;
        if (!b.fecha_vencimiento) return -1;
        return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime();
      });

      setVencimientos(docsCombinados);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los vencimientos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return { vencimientos, loading, error, recargar: cargarDatos };
}
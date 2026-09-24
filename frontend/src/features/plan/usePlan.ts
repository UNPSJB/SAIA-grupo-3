import { useState, useEffect, useCallback } from 'react';
import type { Plan, PlanCreate, PlanUpdate } from './types';
import { getPlanes, createPlan, updatePlan, deletePlan } from './planApi';

export function usePlan() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const cargarPlanes = useCallback((currentPage: number, currentSize: number, showInactive: boolean) => {
    setLoading(true);
    getPlanes(currentPage, currentSize, showInactive)
      .then((data) => {
        setPlanes(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarPlanes(page, size, mostrarInactivos);
  }, [cargarPlanes, page, size, mostrarInactivos]);

  const eliminar = async (id: number) => {
    await deletePlan(id);
    cargarPlanes(page, size, mostrarInactivos);
  };

  const guardar = async (datos: PlanCreate | PlanUpdate, idExistente?: number) => {
    if (idExistente) {
      await updatePlan(idExistente, datos as PlanUpdate);
    } else {
      await createPlan(datos as PlanCreate);
    }
    cargarPlanes(page, size, mostrarInactivos);
  };

  const nextPage = () => { if (page < totalPages) setPage(p => p + 1); };
  const prevPage = () => { if (page > 1) setPage(p => p - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return { planes, loading, error, guardar, eliminar, page, totalPages, total, nextPage, prevPage, changePage, mostrarInactivos, setMostrarInactivos };
}
import { useEffect, useState } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../libreria/api';
export function useOptions<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const all: T[] = [];
        for (let page = 1; ; page++) {
          const response = await fetchWithAuth(`${API_BASE_URL}/${endpoint}?page=${page}&size=100`);
          if (!response.ok) throw new Error('No se pudieron cargar las opciones.');
          const data = await response.json();
          all.push(...data.items);
          if (!active) return;
          if (page >= data.pages) break;
        }
        if (active) {
          setItems(all);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar opciones.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [endpoint]);
  return { items, loading, error };
}

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
export function useCrudRoute<T extends { id?: number }>(
  base: string,
  load: (id: number) => Promise<T>,
) {
  const { id, action } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.pathname.endsWith('/nuevo')
    ? 'crear'
    : id
      ? action === 'editar'
        ? 'editar'
        : action === 'eliminar'
          ? 'eliminar'
          : 'ver'
      : 'listado';
  const [detail, setDetail] = useState<{ key: string; item: T | null; error: string | null }>({
    key: '',
    item: null,
    error: null,
  });
  const invalidAction = !!action && !['editar', 'eliminar'].includes(action);
  const key = `${id}/${action}`;
  useEffect(() => {
    if (!id || invalidAction) return;
    let active = true;
    const number = Number(id);
    if (!Number.isSafeInteger(number) || number < 1) {
      Promise.resolve().then(() => {
        if (active) setDetail({ key, item: null, error: 'Identificador inválido.' });
      });
    } else {
      load(number)
        .then((item) => {
          if (active) setDetail({ key, item, error: null });
        })
        .catch((err) => {
          if (active)
            setDetail({
              key,
              item: null,
              error: err instanceof Error ? err.message : 'No se encontró el registro.',
            });
        });
    }
    return () => {
      active = false;
    };
  }, [id, key, load, invalidAction]);
  const open = (item?: T, action?: 'editar' | 'eliminar') =>
    navigate(
      `${base}/${item ? `${item.id}${action ? `/${action}` : ''}` : 'nuevo'}${location.search}`,
    );
  return {
    mode,
    item: !invalidAction && detail.key === key ? detail.item : null,
    error: invalidAction ? 'Página no encontrada.' : detail.key === key ? detail.error : null,
    loading: !invalidAction && !!id && detail.key !== key,
    open,
    back: () => navigate(`${base}${location.search}`),
    refresh: async () => {
      if (id) setDetail({ key, item: await load(Number(id)), error: null });
    },
  };
}

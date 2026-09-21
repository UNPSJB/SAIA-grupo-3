import { API_BASE_URL } from '../../shared/libreria/api';

export interface SectorOption {
  id: number;
  nombre: string;
  activo: boolean;
}

interface PaginatedSectores {
  items: SectorOption[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export async function getSectoresActivos(): Promise<SectorOption[]> {
  const res = await fetch(`${API_BASE_URL}/sectores?page=1&size=100`);
  if (!res.ok) throw new Error('No se pudo cargar la nómina de sectores.');
  const data: PaginatedSectores = await res.json();
  return data.items.filter((s) => s.activo);
}
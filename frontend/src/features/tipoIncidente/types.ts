export interface TipoIncidente {
  id: number;
  nombre: string;
  color: string;
  activo: boolean;
}

export interface TipoIncidenteDatos {
  nombre?: string;
  color?: string;
  activo?: boolean;
}

export interface PaginatedTiposIncidente {
  items: TipoIncidente[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TipoDocumento {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface TipoDocumentoDatos {
  nombre?: string;
  activo?: boolean;
}

export interface PaginatedTiposDocumento {
  items: TipoDocumento[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

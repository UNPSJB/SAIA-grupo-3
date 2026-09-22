export interface Tarea {
  id?: number;
  descripcion: string;
}

export interface PaginatedTareas {
  items: Tarea[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
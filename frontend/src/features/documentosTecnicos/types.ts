export type TipoDocumentoTecnico = 'manual_bpm' | 'ficha_tecnica' | 'procedimiento' | 'receta';
export type EstadoDocumento = 'vigente' | 'archivado';

export const TIPOS_DOCUMENTO_TECNICO: { value: TipoDocumentoTecnico; label: string }[] = [
  { value: 'manual_bpm', label: 'Manual de BPM' },
  { value: 'ficha_tecnica', label: 'Ficha técnica' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'receta', label: 'Receta' },
];

export interface PersonalResumen {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
}

export interface VersionDocumentoTecnico {
  id: number;
  numero: number;
  estado: EstadoDocumento;
  nombre_original: string;
  tipo_contenido: string;
  tamanio_bytes: number;
  comentario: string | null;
  fecha_subida: string;
  subido_por: PersonalResumen;
}

export interface DocumentoTecnicoResumen {
  id: number;
  nombre: string;
  tipo: TipoDocumentoTecnico;
  descripcion: string | null;
  fecha_creacion: string;
  version_vigente: VersionDocumentoTecnico | null;
}

export interface DocumentoTecnico extends DocumentoTecnicoResumen {
  versiones: VersionDocumentoTecnico[];
}

export interface DocumentoTecnicoDatos {
  nombre: string;
  tipo: TipoDocumentoTecnico;
  descripcion: string | null;
}

export interface PaginatedDocumentosTecnicos {
  items: DocumentoTecnicoResumen[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

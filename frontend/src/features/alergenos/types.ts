export interface Alergeno {
  id: number;
  nombre: string;
  grupo: string;
  texto_declaracion: string;
  implica_gluten: boolean;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

export interface AlergenoDatos {
  nombre: string;
  grupo: string;
  texto_declaracion: string;
  implica_gluten: boolean;
  descripcion: string | null;
  orden: number;
}

export interface AlergenoResumen {
  id: number;
  nombre: string;
  implica_gluten: boolean;
}

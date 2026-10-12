// ---------- Acción correctiva de un incidente ----------

export interface AccionCorrectiva {
  id: number;
  incidente_id: number;
  descripcion: string;
  fecha_cierre: string;
  vigente: boolean;
  responsable: {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
  };
}

export interface AccionCorrectivaInput {
  descripcion: string;
}

export interface ReaperturaInput {
  motivo: string;
}

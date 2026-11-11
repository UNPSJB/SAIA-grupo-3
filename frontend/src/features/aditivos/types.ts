export interface ClaseFuncional {
  id: number;
  nombre: string;
  ins_opcional: boolean;
  activo: boolean;
}

export interface ClaseFuncionalDatos {
  nombre: string;
  ins_opcional: boolean;
}

export interface AditivoReferencia {
  id: number;
  clase_funcional_id: number;
  nombre: string;
  ins: string | null;
  activo: boolean;
  clase_funcional: ClaseFuncional;
}

export interface AditivoReferenciaDatos {
  clase_funcional_id: number;
  nombre: string;
  ins: string | null;
}

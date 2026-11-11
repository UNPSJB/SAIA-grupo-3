import { numeroDesdeTexto, textoOpcional } from './formato';
import type { TipoInsumo, Version, VersionDatos } from './types';

export interface ValoresRenglon {
  tipo: TipoInsumo;
  insumo_id: string;
  cantidad: string;
  unidad_medida_id: string;
}

export interface ValoresPaso {
  nombre: string;
  procedimiento: string;
  equipo_id: string;
  tiempo_minutos: string;
  temperatura_celsius: string;
  punto_control: boolean;
}

export interface ValoresReceta {
  producto_id: string;
  rendimiento_cantidad: string;
  rendimiento_unidad_id: string;
  porcion_cantidad: string;
  porcion_unidad_id: string;
  porcion_medida_casera: string;
  motivo: string;
  renglones: ValoresRenglon[];
  pasos: ValoresPaso[];
}

export const PASO_VACIO: ValoresPaso = {
  nombre: '',
  procedimiento: '',
  equipo_id: '',
  tiempo_minutos: '',
  temperatura_celsius: '',
  punto_control: false,
};

export function valoresIniciales(productoId: string, version?: Version): ValoresReceta {
  if (!version) {
    return {
      producto_id: productoId,
      rendimiento_cantidad: '',
      rendimiento_unidad_id: '',
      porcion_cantidad: '',
      porcion_unidad_id: '',
      porcion_medida_casera: '',
      motivo: '',
      renglones: [{ tipo: 'ingrediente', insumo_id: '', cantidad: '', unidad_medida_id: '' }],
      pasos: [],
    };
  }
  return {
    producto_id: productoId,
    rendimiento_cantidad: String(version.rendimiento_cantidad),
    rendimiento_unidad_id: String(version.rendimiento_unidad.id),
    porcion_cantidad: textoOpcional(version.porcion_cantidad),
    porcion_unidad_id: version.porcion_unidad ? String(version.porcion_unidad.id) : '',
    porcion_medida_casera: version.porcion_medida_casera ?? '',
    motivo: '',
    renglones: version.renglones.map((renglon) => ({
      tipo: renglon.tipo,
      insumo_id: String(renglon.insumo.id),
      cantidad: String(renglon.cantidad),
      unidad_medida_id: String(renglon.unidad_medida.id),
    })),
    pasos: version.pasos.map((paso) => ({
      nombre: paso.nombre,
      procedimiento: paso.procedimiento,
      equipo_id: paso.equipo ? String(paso.equipo.id) : '',
      tiempo_minutos: textoOpcional(paso.tiempo_minutos),
      temperatura_celsius: textoOpcional(paso.temperatura_celsius),
      punto_control: paso.punto_control,
    })),
  };
}

function numeroOpcional(valor: string): number | null {
  return valor.trim() ? numeroDesdeTexto(valor) : null;
}

export function aDatosVersion(valores: ValoresReceta): VersionDatos {
  return {
    rendimiento_cantidad: numeroDesdeTexto(valores.rendimiento_cantidad),
    rendimiento_unidad_id: Number(valores.rendimiento_unidad_id),
    porcion_cantidad: numeroOpcional(valores.porcion_cantidad),
    porcion_unidad_id: valores.porcion_unidad_id ? Number(valores.porcion_unidad_id) : null,
    porcion_medida_casera: valores.porcion_medida_casera.trim() || null,
    renglones: valores.renglones.map((renglon) => ({
      insumo_id: Number(renglon.insumo_id),
      tipo: renglon.tipo,
      cantidad: numeroDesdeTexto(renglon.cantidad),
      unidad_medida_id: Number(renglon.unidad_medida_id),
    })),
    pasos: valores.pasos.map((paso) => ({
      nombre: paso.nombre.trim(),
      procedimiento: paso.procedimiento.trim(),
      equipo_id: paso.equipo_id ? Number(paso.equipo_id) : null,
      tiempo_minutos: numeroOpcional(paso.tiempo_minutos),
      temperatura_celsius: numeroOpcional(paso.temperatura_celsius),
      punto_control: paso.punto_control,
    })),
  };
}

import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { Insumo } from '../insumos/types';
import type {
  ConsumoRecepcion,
  LoteInput,
  LoteRecepcion,
  Pagina,
  Proveedor,
  ProveedorInput,
  Stock,
} from './types';

type Filtros = Record<string, string | number | boolean | undefined>;

function parametros(filtros: Filtros): string {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== '') params.set(clave, String(valor));
  });
  return params.toString();
}

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!respuesta.ok)
    throw new Error(await mensajeDeRespuesta(respuesta, 'No se pudo completar la operación.'));
  return respuesta.json();
}

export function listarProveedores(
  filtros: Filtros = {},
  signal?: AbortSignal,
): Promise<Pagina<Proveedor>> {
  return solicitar(`/proveedores/?${parametros({ page: 1, size: 10, ...filtros })}`, { signal });
}

export function guardarProveedor(datos: ProveedorInput, id?: number): Promise<Proveedor> {
  return solicitar(id ? `/proveedores/${id}` : '/proveedores/', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(datos),
  });
}

export function cambiarEstadoProveedor(id: number, activo: boolean): Promise<Proveedor> {
  return solicitar(`/proveedores/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
}

export function listarLotes(
  filtros: Filtros = {},
  signal?: AbortSignal,
): Promise<Pagina<LoteRecepcion>> {
  return solicitar(`/lotes-insumo/?${parametros({ page: 1, size: 10, ...filtros })}`, { signal });
}

export function guardarLote(
  datos: LoteInput,
  id?: number,
  conciliar = false,
): Promise<LoteRecepcion> {
  const ruta = id
    ? `/lotes-insumo/${id}`
    : conciliar
      ? '/lotes-insumo/conciliar-stock'
      : '/lotes-insumo/';
  return solicitar(ruta, { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
}

export function anularLote(id: number): Promise<LoteRecepcion> {
  return solicitar(`/lotes-insumo/${id}`, { method: 'DELETE' });
}

export function obtenerStock(insumoId: number, signal?: AbortSignal): Promise<Stock> {
  return solicitar(`/lotes-insumo/resumen/${insumoId}`, { signal });
}

export function obtenerTrazabilidad(
  loteId: number,
  signal?: AbortSignal,
): Promise<ConsumoRecepcion[]> {
  return solicitar(`/lotes-insumo/${loteId}/trazabilidad`, { signal });
}

async function obtenerTodos<T>(
  ruta: string,
  signal: AbortSignal,
  mostrarInactivos = false,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let pages: number;
  do {
    const resultado = await solicitar<Pagina<T>>(
      `${ruta}?${parametros({ page, size: 100, mostrar_inactivos: mostrarInactivos })}`,
      { signal },
    );
    items.push(...resultado.items);
    pages = resultado.pages;
    page += 1;
  } while (page <= pages);
  return items;
}

async function opciones(signal: AbortSignal, incluirInactivos: boolean) {
  const [insumos, proveedores] = await Promise.all([
    obtenerTodos<Insumo>('/insumos/', signal, incluirInactivos),
    obtenerTodos<Proveedor>('/proveedores/', signal, incluirInactivos),
  ]);
  return { insumos, proveedores };
}

export function cargarOpciones(signal: AbortSignal) {
  return opciones(signal, false);
}
export function cargarOpcionesFiltros(signal: AbortSignal) {
  return opciones(signal, true);
}

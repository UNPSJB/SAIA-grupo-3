import type { Escalado } from '../recetas/types';
import type { PrecargaLote } from './types';

export function precargaDesde(escalado: Escalado): PrecargaLote {
  const precargables = escalado.renglones.filter(
    (renglon) => renglon.insumo.activo && renglon.cantidad_en_unidad_stock !== null,
  );
  return {
    recetaId: escalado.receta_id,
    versionId: escalado.version_id,
    versionNumero: escalado.version_numero,
    factor: escalado.factor,
    productoId: escalado.producto.id,
    productoNombre: escalado.producto.nombre,
    cantidad: escalado.cantidad_lote,
    insumos: precargables.map((renglon) => ({
      insumoId: renglon.insumo.id,
      cantidad: renglon.cantidad_en_unidad_stock ?? 0,
    })),
    sinPrecargar: escalado.renglones
      .filter((renglon) => !precargables.includes(renglon))
      .map((renglon) => renglon.insumo.nombre),
  };
}

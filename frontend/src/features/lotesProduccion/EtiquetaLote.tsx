import { formatearFecha } from '../../shared/libreria/fechas';
import { CodigoBarras } from './CodigoBarras';
import { formatearCantidad } from './formato';
import type { LoteProduccion } from './types';
import './EtiquetaLote.css';

interface EtiquetaLoteProps {
  lote: LoteProduccion;
  codigoBarras: string;
}

export function EtiquetaLote({ lote, codigoBarras }: EtiquetaLoteProps) {
  return (
    <div className="etiqueta-lote">
      <div className="etiqueta-lote-encabezado">
        <span>SAIA · Uso interno</span>
        <span>Lote de producción</span>
      </div>
      <div className="etiqueta-lote-cuerpo">
        <div className="etiqueta-lote-datos">
          <span className="etiqueta-lote-producto">{lote.producto.nombre}</span>
          <span className="etiqueta-lote-codigo">{lote.codigo}</span>
          <span>Producción: {formatearFecha(lote.fecha_produccion)}</span>
          <span>
            Cantidad: {formatearCantidad(lote.cantidad)} {lote.producto.unidad_medida.sufijo}
          </span>
        </div>
        <div className="etiqueta-lote-barras">
          <CodigoBarras codigo={codigoBarras} modulo={2} alto={70} />
        </div>
      </div>
    </div>
  );
}

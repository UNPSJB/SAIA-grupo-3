import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { useAnchoElemento } from '../../hooks/useAnchoElemento';
import { useTema } from '../../hooks/useTema';
import { colorDeTema, coloresGrafico, formatearNumero } from '../../libreria/graficos';
import { TooltipGrafico, type LineaTooltip } from './TooltipGrafico';
import './graficos.css';

export interface DatoBarra {
  id: string | number;
  etiqueta: string;
  valor: number;
  /** Color de la entidad (variante de Bootstrap, variable CSS o hex). */
  color?: string;
  /** Líneas extra del tooltip (ej. abiertos y cerrados). */
  detalle?: LineaTooltip[];
}

interface GraficoBarrasProps {
  datos: DatoBarra[];
  /** Nombre del valor en el tooltip (ej. "Incidentes"). */
  nombreValor: string;
  formatoValor?: (valor: number) => string;
  /** Barra resaltada; las demás se atenúan. */
  seleccionado?: string | number | null;
  /** Si se pasa, las barras se pueden tocar. */
  onSeleccionar?: (dato: DatoBarra) => void;
  textoAyuda?: string;
}

const ALTO_BARRA = 36;
const ALTO_EJE = 32;
const PIXELES_POR_LETRA = 7.5;

/** Recorta un nombre largo para que entre en el eje (el tooltip muestra el completo). */
function recortar(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, Math.max(1, maximo - 1))}…` : texto;
}

/** Barras horizontales: comparar cantidades entre categorías (ej. incidentes por tipo). */
export function GraficoBarras({
  datos,
  nombreValor,
  formatoValor = (valor) => formatearNumero(valor),
  seleccionado = null,
  onSeleccionar,
  textoAyuda,
}: GraficoBarrasProps) {
  useTema(); // vuelve a resolver los colores al cambiar entre tema claro y oscuro
  const colores = coloresGrafico();
  const { ref, ancho } = useAnchoElemento<HTMLDivElement>();
  // Las etiquetas usan como máximo el 40 % del ancho, así las barras siempre se ven.
  const largoMayor = Math.max(0, ...datos.map((dato) => dato.etiqueta.length));
  const anchoEtiquetas = Math.round(
    Math.min(180, ancho * 0.4, Math.max(60, largoMayor * PIXELES_POR_LETRA)),
  );
  const letrasVisibles = Math.floor(anchoEtiquetas / PIXELES_POR_LETRA);
  const alto = datos.length * ALTO_BARRA + ALTO_EJE;

  return (
    <div
      ref={ref}
      className={onSeleccionar ? 'grafico-clickeable' : undefined}
      style={{ minHeight: alto }}
    >
      {ancho > 0 && (
        <BarChart
          width={ancho}
          height={alto}
          data={datos}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
          barCategoryGap={8}
        >
          <CartesianGrid horizontal={false} stroke={colores.grilla} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: colores.textoSecundario, fontSize: 12 }}
            stroke={colores.grilla}
            tickFormatter={formatoValor}
          />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={anchoEtiquetas}
            tick={{ fill: colores.texto, fontSize: 13 }}
            tickFormatter={(texto: string) => recortar(texto, letrasVisibles)}
            stroke={colores.grilla}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: colores.grilla, opacity: 0.5 }}
            content={({ active, payload }) => {
              const dato = active ? (payload?.[0]?.payload as DatoBarra | undefined) : undefined;
              if (!dato) return null;
              return (
                <TooltipGrafico
                  titulo={dato.etiqueta}
                  lineas={[
                    {
                      etiqueta: nombreValor,
                      valor: formatoValor(dato.valor),
                      color: colorDeTema(dato.color ?? 'primary'),
                    },
                    ...(dato.detalle ?? []),
                  ]}
                  pie={onSeleccionar ? textoAyuda : undefined}
                />
              );
            }}
          />
          <Bar
            dataKey="valor"
            name={nombreValor}
            maxBarSize={24}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            onClick={
              onSeleccionar ? (entrada) => onSeleccionar(entrada.payload as DatoBarra) : undefined
            }
          >
            {datos.map((dato) => (
              <Cell
                key={dato.id}
                fill={colorDeTema(dato.color ?? 'primary')}
                fillOpacity={seleccionado === null || seleccionado === dato.id ? 1 : 0.3}
              />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(valor) => formatoValor(Number(valor))}
              style={{ fill: colores.texto, fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      )}
    </div>
  );
}

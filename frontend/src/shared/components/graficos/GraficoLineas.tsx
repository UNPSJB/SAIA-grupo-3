import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTema } from '../../hooks/useTema';
import { colorDeTema, coloresGrafico, formatearNumero } from '../../libreria/graficos';
import { TooltipGrafico } from './TooltipGrafico';
import type { PuntoSerie } from './tipos';
import './graficos.css';

interface GraficoLineasProps {
  datos: PuntoSerie[];
  nombreValor: string;
  formatoValor?: (valor: number) => string;
  /** Color de la serie (variante de Bootstrap, variable CSS o hex). */
  color?: string;
  alto?: number;
}

/** Evolución de un valor continuo en el tiempo (una sola serie), ej. temperaturas. */
export function GraficoLineas({
  datos,
  nombreValor,
  formatoValor = (valor) => formatearNumero(valor),
  color = 'primary',
  alto = 240,
}: GraficoLineasProps) {
  useTema();
  const colores = coloresGrafico();
  const colorSerie = colorDeTema(color);
  // Con muchos puntos, los marcadores ensucian la línea: se ven al pasar el mouse.
  const conPuntos = datos.length <= 14;

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <AreaChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={colores.grilla} />
        <XAxis
          dataKey="etiqueta"
          tick={{ fill: colores.textoSecundario, fontSize: 12 }}
          stroke={colores.grilla}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: colores.textoSecundario, fontSize: 12 }}
          stroke={colores.grilla}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatoValor}
        />
        <Tooltip
          cursor={{ stroke: colores.textoSecundario, strokeWidth: 1 }}
          content={({ active, payload }) => {
            const punto = active ? (payload?.[0]?.payload as PuntoSerie | undefined) : undefined;
            if (!punto) return null;
            return (
              <TooltipGrafico
                titulo={punto.etiquetaLarga ?? punto.etiqueta}
                lineas={[
                  { etiqueta: nombreValor, valor: formatoValor(punto.valor), color: colorSerie },
                ]}
              />
            );
          }}
        />
        <Area
          type="linear"
          dataKey="valor"
          name={nombreValor}
          stroke={colorSerie}
          strokeWidth={2}
          fill={colorSerie}
          fillOpacity={0.12}
          dot={
            conPuntos
              ? { r: 3, fill: colorSerie, stroke: colores.superficie, strokeWidth: 2 }
              : false
          }
          activeDot={{ r: 5, fill: colorSerie, stroke: colores.superficie, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

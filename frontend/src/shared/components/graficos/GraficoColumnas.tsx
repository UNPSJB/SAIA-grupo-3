import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTema } from '../../hooks/useTema';
import { colorDeTema, coloresGrafico, formatearNumero } from '../../libreria/graficos';
import { TooltipGrafico } from './TooltipGrafico';
import type { PuntoSerie } from './tipos';
import './graficos.css';

interface GraficoColumnasProps {
  datos: PuntoSerie[];
  nombreValor: string;
  formatoValor?: (valor: number) => string;
  /** Color de la serie (variante de Bootstrap, variable CSS o hex). */
  color?: string;
  alto?: number;
}

/** Cantidades por período (día, semana, mes): una columna por período, una sola serie. */
export function GraficoColumnas({
  datos,
  nombreValor,
  formatoValor = (valor) => formatearNumero(valor),
  color = 'primary',
  alto = 240,
}: GraficoColumnasProps) {
  useTema();
  const colores = coloresGrafico();
  const colorSerie = colorDeTema(color);

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
        barCategoryGap="20%"
      >
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
          cursor={{ fill: colores.grilla, opacity: 0.5 }}
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
        <Bar
          dataKey="valor"
          name={nombreValor}
          fill={colorSerie}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

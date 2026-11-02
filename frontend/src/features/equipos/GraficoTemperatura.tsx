import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { useAnchoElemento } from '../../shared/hooks/useAnchoElemento';
import { useTema } from '../../shared/hooks/useTema';
import { coloresGrafico } from '../../shared/libreria/graficos';
import type { RegistroTemperatura } from '../registroTemperatura/registroTemperaturaApi';

interface GraficoTemperaturaProps {
  registros: RegistroTemperatura[];
  temperaturaMinima: number;
  temperaturaMaxima: number;
}

export function GraficoTemperatura({ registros, temperaturaMinima, temperaturaMaxima }: GraficoTemperaturaProps) {
  useTema();
  const colores = coloresGrafico();
  const { ref, ancho } = useAnchoElemento<HTMLDivElement>();
  const alto = 300;
  const datosGrafico = [...registros].reverse().map(reg => {
    const fecha = new Date(reg.fecha_hora_registro);
    return {
      fechaLabel: `${fecha.getDate()}/${fecha.getMonth() + 1}`,
      fechaCompleta: fecha.toLocaleString(),
      temperatura: reg.temperatura_registrada,
      operario: `${reg.operario.nombre} ${reg.operario.apellido}`,
      fueraRango: reg.fuera_de_rango
    };
  });

  const safeMin = Number(temperaturaMinima) || 0;
  const safeMax = Number(temperaturaMaxima) || 0;
  const temps = datosGrafico.map(d => Number(d.temperatura));
  const minTemp = Math.floor(Math.min(...temps, safeMin)) - 2;
  const maxTemp = Math.ceil(Math.max(...temps, safeMax)) + 2;
  if (registros.length === 0) {
    return <p className="text-center text-muted p-4">No hay datos suficientes para graficar.</p>;
  }

  return (
    <div ref={ref} style={{ minHeight: alto, width: '100%', padding: '1rem 0' }}>
      {ancho > 0 && (
        <LineChart
          width={ancho}
          height={alto}
          data={datosGrafico}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colores.grilla} />

         <XAxis
            dataKey="fechaLabel"
            tick={{ fill: colores.textoSecundario, fontSize: 14 }}
            stroke={colores.grilla}
          />
          <YAxis
            domain={[minTemp, maxTemp]}
            tick={{ fill: colores.textoSecundario, fontSize: 14 }}
            stroke={colores.grilla}
            width={70}
            tickFormatter={(valor) => `${valor}°C`}
            allowDecimals={false}
          />

          <Tooltip
            contentStyle={{ backgroundColor: 'var(--bs-body-bg)', borderColor: colores.grilla, borderRadius: '8px' }}
            itemStyle={{ color: colores.texto }}
            labelStyle={{ color: colores.texto, fontWeight: 'bold', marginBottom: '5px' }}
            formatter={(value) => [`${value}°C`, 'Temperatura']}
            labelFormatter={(label, payload) => {
              if (payload && payload.length > 0) {
                return payload[0].payload.fechaCompleta;
              }
              return label;
            }}
          />
          <ReferenceLine y={temperaturaMaxima} stroke="red" strokeDasharray="5 5" label={{ position: 'top', value: 'Máx', fill: 'red', fontSize: 12 }} />
          <ReferenceLine y={temperaturaMinima} stroke="blue" strokeDasharray="5 5" label={{ position: 'bottom', value: 'Mín', fill: 'blue', fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="temperatura"
            stroke="#0d6efd"
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </div>
  );
}

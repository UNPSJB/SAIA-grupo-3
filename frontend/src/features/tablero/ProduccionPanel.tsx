import { useId, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import './ProduccionPanel.css';

interface ProductoProduccion {
  id: number;
  nombre: string;
  unidad_medida_id: number;
  unidad: string;
}
interface SerieProduccion {
  producto: ProductoProduccion;
  total: number;
  puntos: { fecha: string; cantidad: number }[];
}
interface DatosProduccion {
  desde: string;
  hasta: string;
  productos: ProductoProduccion[];
  series: SerieProduccion[];
}
interface Filtros { desde: string; hasta: string; producto: string }
const COLORES = ['#82b4ff', '#75bfa4', '#b9a3ed', '#e3b877', '#e696a0', '#8dcdd2'];
const numero = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
const fecha = (s: string) => s.split('-').reverse().join('/');
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function filtrosIniciales(): Filtros {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - 29);
  return { desde: isoLocal(desde), hasta: isoLocal(hasta), producto: '' };
}

async function consultar(filtros: Filtros): Promise<DatosProduccion> {
  const params = new URLSearchParams({ fecha_desde: filtros.desde, fecha_hasta: filtros.hasta });
  if (filtros.producto) params.set('producto_id', filtros.producto);
  const res = await fetchWithAuth(`${API_BASE_URL}/tablero/produccion?${params}`);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, 'No se pudo cargar la producción.'));
  return res.json();
}

function GraficoUnidad({ series, modo, desde, hasta }: {
  series: SerieProduccion[]; modo: 'lineas' | 'barras'; desde: string; hasta: string;
}) {
  const dias = new Map<string, Record<string, number | string>>();
  const inicio = new Date(`${desde}T12:00:00`);
  const fin = new Date(`${hasta}T12:00:00`);
  for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    const dia = isoLocal(d);
    dias.set(dia, Object.fromEntries([['fecha', dia], ...series.map(s => [String(s.producto.id), 0])]));
  }
  for (const serie of series) for (const punto of serie.puntos) {
    const fila = dias.get(punto.fecha);
    if (fila) fila[String(serie.producto.id)] = punto.cantidad;
  }
  const unidad = series[0].producto.unidad;
  return (
    <div className="produccion-unidad">
      <div className="produccion-eje">Cantidad producida · {unidad}</div>
      <div className="produccion-grafico" role="img" aria-label={`Producción por fecha en ${unidad}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={[...dias.values()]} margin={{ top: 15, right: 15, left: 0, bottom: 8 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--bs-border-color)" strokeDasharray="3 5" />
            <XAxis dataKey="fecha" tickFormatter={v => fecha(String(v)).slice(0, 5)} minTickGap={28} tick={{ fill: 'var(--bs-secondary-color)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis width={55} tickFormatter={numero} tick={{ fill: 'var(--bs-secondary-color)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
            <Tooltip labelFormatter={v => fecha(String(v))} formatter={(v) => `${numero(Number(v))} ${unidad}`} contentStyle={{ background: 'var(--bs-body-bg)', borderColor: 'var(--bs-border-color)', borderRadius: 8 }} labelStyle={{ color: 'var(--bs-body-color)' }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {series.map(serie => modo === 'lineas' ? (
              <Line key={serie.producto.id} dataKey={String(serie.producto.id)} name={serie.producto.nombre} stroke={COLORES[serie.producto.id % COLORES.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} type="linear" isAnimationActive={false} />
            ) : (
              <Bar key={serie.producto.id} dataKey={String(serie.producto.id)} name={serie.producto.nombre} fill={COLORES[serie.producto.id % COLORES.length]} radius={[3, 3, 0, 0]} maxBarSize={25} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProduccionPanel() {
  const id = useId();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [consulta, setConsulta] = useState(filtros);
  const [modo, setModo] = useState<'lineas' | 'barras'>('lineas');
  const [validacion, setValidacion] = useState('');
  const { datos, error, cargando, recargar } = useConsulta(() => consultar(consulta), [consulta.desde, consulta.hasta, consulta.producto]);
  const grupos = new Map<number, SerieProduccion[]>();
  for (const serie of datos?.series ?? []) {
    const key = serie.producto.unidad_medida_id;
    grupos.set(key, [...(grupos.get(key) ?? []), serie]);
  }
  function aplicar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (filtros.desde > filtros.hasta) { setValidacion('La fecha inicial no puede ser posterior a la final.'); return; }
    const dias = (Date.parse(filtros.hasta) - Date.parse(filtros.desde)) / 86400000;
    if (dias > 365) { setValidacion('Seleccioná un rango de hasta 366 días.'); return; }
    setValidacion('');
    setConsulta({ ...filtros });
    recargar();
  }
  return (
    <section className="produccion-panel mt-4" aria-labelledby={`${id}-titulo`}>
      <header className="produccion-encabezado">
        <span className="produccion-icono"><i className="bi bi-graph-up-arrow" aria-hidden="true" /></span>
        <div><h2 id={`${id}-titulo`}>Tu producción, en perspectiva</h2><p>Cantidad elaborada por producto a lo largo del tiempo.</p></div>
      </header>
      <Form className="produccion-filtros" onSubmit={aplicar}>
        <Form.Group controlId={`${id}-producto`} className="produccion-filtro-producto"><Form.Label>Producto</Form.Label><Form.Select value={filtros.producto} onChange={e => setFiltros({ ...filtros, producto: e.target.value })}><option value="">Todos los productos</option>{datos?.productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Form.Select></Form.Group>
        <Form.Group controlId={`${id}-desde`}><Form.Label>Desde</Form.Label><Form.Control required type="date" value={filtros.desde} onChange={e => setFiltros({ ...filtros, desde: e.target.value })} /></Form.Group>
        <Form.Group controlId={`${id}-hasta`}><Form.Label>Hasta</Form.Label><Form.Control required type="date" value={filtros.hasta} onChange={e => setFiltros({ ...filtros, hasta: e.target.value })} /></Form.Group>
        <Button type="submit" variant="success" disabled={cargando}><i className="bi bi-funnel me-1" aria-hidden="true" />Aplicar</Button>
      </Form>
      {validacion && <Alert variant="danger" className="m-3" role="alert">{validacion}</Alert>}
      <div className="produccion-visual-encabezado"><div><h3>Evolución de la producción</h3><p>{fecha(consulta.desde)} — {fecha(consulta.hasta)}</p></div><div className="produccion-modos" aria-label="Tipo de gráfico">{(['lineas', 'barras'] as const).map(m => <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)}><i className={`bi ${m === 'lineas' ? 'bi-graph-up' : 'bi-bar-chart'}`} aria-hidden="true" />{m === 'lineas' ? 'Líneas' : 'Barras'}</button>)}</div></div>
      <div aria-live="polite">
        {cargando ? <div className="produccion-mensaje"><Spinner size="sm" className="me-2" />Cargando producción…</div> : error ? <Alert variant="danger" className="m-3" role="alert">{error}<Button variant="link" onClick={recargar}>Reintentar</Button></Alert> : !datos?.series.length ? <div className="produccion-mensaje"><i className="bi bi-bar-chart d-block fs-3 mb-2" aria-hidden="true" />No hay producciones registradas para estos filtros.</div> : (
          <div className="produccion-distribucion"><div className="produccion-graficos">{[...grupos.entries()].map(([unidad, series]) => <GraficoUnidad key={unidad} series={series} modo={modo} desde={datos.desde} hasta={datos.hasta} />)}</div><aside className="produccion-totales"><h4>En este período</h4><p>Total por producto</p>{datos.series.map(s => <div className="produccion-total" key={s.producto.id}><div className="produccion-total-nombre"><span style={{ background: COLORES[s.producto.id % COLORES.length] }} />{s.producto.nombre}</div><div className="produccion-total-valor">{numero(s.total)} <small>{s.producto.unidad}</small></div></div>)}</aside></div>
        )}
      </div>
      <footer className="produccion-pie"><span><i className="bi bi-calendar3 me-2" aria-hidden="true" />Según fecha de producción · registros activos</span><span>Unidades diferentes se muestran en gráficos separados.</span></footer>
    </section>
  );
}
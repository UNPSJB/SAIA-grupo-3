import { useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import {
  GraficoLineas,
  IndicadorNumerico,
  TablaDatos,
  TarjetaGrafico,
  type PuntoSerie,
} from '../../shared/components/graficos';
import { useRangoFechasUrl } from '../../shared/hooks/useRangoFechasUrl';
import { fechaHoyIso, textoRango, type RangoFechas } from '../../shared/libreria/fechas';
import { etiquetaPeriodo, formatearNumero } from '../../shared/libreria/graficos';
import type { AgrupacionCumplimiento, PuntoCumplimiento } from './types';
import { useCumplimientoChecklist } from './useCumplimientoChecklist';
import { ProduccionPanel } from './ProduccionPanel';
import './TableroPage.css';

const OPCIONES_AGRUPACION: { valor: AgrupacionCumplimiento; texto: string }[] = [
  { valor: 'dia', texto: 'Día' },
  { valor: 'semana', texto: 'Semana' },
];
const AGRUPACION_TEXTO = { dia: 'por día', semana: 'por semana' } as const;

function textoPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'Sin tareas';
  return `${formatearNumero(valor, 1)} %`;
}

function FiltrosChecklist({
  rango,
  agrupacion,
  fechaMinima,
  onAplicar,
}: {
  rango: RangoFechas;
  agrupacion: AgrupacionCumplimiento;
  fechaMinima?: string;
  onAplicar: (rango: RangoFechas, agrupacion: AgrupacionCumplimiento) => void;
}) {
  const [error, setError] = useState('');
  return (
    <>
      <Form
        className="produccion-filtros"
        onSubmit={(e) => {
          e.preventDefault();
          const valores = new FormData(e.currentTarget);
          const desde = String(valores.get('desde'));
          const hasta = String(valores.get('hasta'));
          if (desde > hasta) {
            setError('La fecha inicial no puede ser posterior a la final.');
            return;
          }
          setError('');
          onAplicar({ desde, hasta }, valores.get('agrupacion') === 'semana' ? 'semana' : 'dia');
        }}
      >
        <Form.Group controlId="checklist-agrupacion" className="produccion-filtro-producto">
          <Form.Label>Agrupar por</Form.Label>
          <Form.Select name="agrupacion" defaultValue={agrupacion}>
            {OPCIONES_AGRUPACION.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.texto}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group controlId="checklist-desde">
          <Form.Label>Desde</Form.Label>
          <Form.Control
            name="desde"
            type="date"
            required
            defaultValue={rango.desde}
            min={fechaMinima}
            max={fechaHoyIso()}
          />
        </Form.Group>
        <Form.Group controlId="checklist-hasta">
          <Form.Label>Hasta</Form.Label>
          <Form.Control
            name="hasta"
            type="date"
            required
            defaultValue={rango.hasta}
            min={fechaMinima}
            max={fechaHoyIso()}
          />
        </Form.Group>
        <Button type="submit" variant="success">
          <i className="bi bi-funnel me-1" aria-hidden="true" />
          Aplicar
        </Button>
      </Form>
      {error && (
        <Alert variant="danger" className="m-3" role="alert">
          {error}
        </Alert>
      )}
    </>
  );
}

export function TableroPage() {
  const { rango, setRango } = useRangoFechasUrl('cumplimiento', 30);
  const [agrupacion, setAgrupacion] = useState<AgrupacionCumplimiento>('dia');
  const { datos, error, cargando } = useCumplimientoChecklist(rango, agrupacion);

  const agrupacionDatos = datos?.agrupacion ?? agrupacion;
  const filas = datos?.puntos ?? [];
  const conTareas = filas.filter((punto) => punto.porcentaje !== null);
  const puntos: PuntoSerie[] = conTareas.map((punto) => ({
    clave: punto.inicio,
    etiqueta: etiquetaPeriodo(punto.inicio, agrupacionDatos),
    etiquetaLarga: `${etiquetaPeriodo(punto.inicio, agrupacionDatos, true)} · ${punto.realizadas} de ${punto.total} tareas`,
    valor: punto.porcentaje ?? 0,
  }));
  const peor = conTareas.reduce<PuntoCumplimiento | null>(
    (menor, punto) => (!menor || (punto.porcentaje ?? 0) < (menor.porcentaje ?? 0) ? punto : menor),
    null,
  );

  return (
    <div className="p-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h4 className="mb-0">
          <i className="bi bi-graph-up me-2" aria-hidden="true" />
          Tablero de gestión
        </h4>
      </div>
      <section
        className="produccion-panel checklist-panel"
        aria-labelledby="checklist-panel-titulo"
      >
        <header className="produccion-encabezado">
          <span className="produccion-icono">
            <i className="bi bi-clipboard-check" aria-hidden="true" />
          </span>
          <div>
            <h2 id="checklist-panel-titulo">Cumplimiento del checklist</h2>
            <p>Evaluá las tareas de limpieza por día o por semana.</p>
          </div>
        </header>
        <FiltrosChecklist
          key={`${rango.desde}-${rango.hasta}-${agrupacion}`}
          rango={rango}
          agrupacion={agrupacion}
          fechaMinima={datos?.primera_fecha ?? undefined}
          onAplicar={(nuevoRango, nuevaAgrupacion) => {
            setRango(nuevoRango);
            setAgrupacion(nuevaAgrupacion);
          }}
        />
        <div className="checklist-panel-contenido">
          <Row xs={2} lg={4} className="g-3 mb-3">
            <Col>
              <IndicadorNumerico
                titulo="Cumplimiento del período"
                icono="bi-percent"
                variante="primary"
                valor={datos ? textoPorcentaje(datos.porcentaje) : '—'}
                detalle={textoRango(rango)}
              />
            </Col>
            <Col>
              <IndicadorNumerico
                titulo="Tareas realizadas"
                icono="bi-check-circle"
                variante="success"
                valor={datos ? formatearNumero(datos.realizadas) : '—'}
                detalle={datos ? `de ${formatearNumero(datos.total)} tareas` : undefined}
              />
            </Col>
            <Col>
              <IndicadorNumerico
                titulo="Tareas no realizadas"
                icono="bi-x-circle"
                variante="danger"
                valor={datos ? formatearNumero(datos.total - datos.realizadas) : '—'}
              />
            </Col>
            <Col>
              <IndicadorNumerico
                titulo="Período más bajo"
                icono="bi-graph-down-arrow"
                variante="warning"
                valor={peor ? textoPorcentaje(peor.porcentaje) : '—'}
                detalle={peor ? etiquetaPeriodo(peor.inicio, agrupacionDatos, true) : undefined}
              />
            </Col>
          </Row>

          <TarjetaGrafico
            titulo="Cumplimiento del checklist de limpieza"
            subtitulo={`Porcentaje de tareas realizadas ${AGRUPACION_TEXTO[agrupacionDatos]}. No incluye el período en curso.`}
            cargando={cargando}
            error={error}
            vacio={!datos || datos.total === 0}
            mensajeVacio="No hay tareas del checklist vencidas en este período."
            tabla={
              <TablaDatos<PuntoCumplimiento>
                filas={filas}
                clave={(fila) => fila.inicio}
                columnas={[
                  {
                    titulo: 'Período',
                    valor: (fila) => etiquetaPeriodo(fila.inicio, agrupacionDatos, true),
                  },
                  {
                    titulo: 'Realizadas',
                    valor: (fila) => formatearNumero(fila.realizadas),
                    numerica: true,
                  },
                  { titulo: 'Total', valor: (fila) => formatearNumero(fila.total), numerica: true },
                  {
                    titulo: 'Cumplimiento',
                    valor: (fila) => textoPorcentaje(fila.porcentaje),
                    numerica: true,
                  },
                ]}
              />
            }
          >
            <GraficoLineas
              datos={puntos}
              nombreValor="Cumplimiento"
              formatoValor={(valor) => `${formatearNumero(valor, 1)} %`}
              color="success"
              alto={300}
            />
          </TarjetaGrafico>
        </div>
      </section>
      <ProduccionPanel />
    </div>
  );
}

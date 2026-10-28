import { useState } from 'react';
import { Button, ButtonGroup, Col, Row } from 'react-bootstrap';
import {
  GraficoLineas,
  IndicadorNumerico,
  SelectorPeriodo,
  TablaDatos,
  TarjetaGrafico,
  type PuntoSerie,
} from '../../shared/components/graficos';
import { useRangoFechasUrl } from '../../shared/hooks/useRangoFechasUrl';
import { textoRango } from '../../shared/libreria/fechas';
import {
  etiquetaPeriodo,
  formatearNumero,
} from '../../shared/libreria/graficos';
import type { AgrupacionCumplimiento, PuntoCumplimiento } from './types';
import { useCumplimientoChecklist } from './useCumplimientoChecklist';


const OPCIONES_AGRUPACION: { valor: AgrupacionCumplimiento; texto: string }[] = [
  { valor: 'dia', texto: 'Día' },
  { valor: 'semana', texto: 'Semana' },
];
const AGRUPACION_TEXTO = { dia: 'por día', semana: 'por semana' } as const;

function textoPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'Sin tareas';
  return `${formatearNumero(valor, 1)} %`;
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
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ButtonGroup size="sm" aria-label="Agrupar por">
            {OPCIONES_AGRUPACION.map((opcion) => (
              <Button
                key={opcion.valor}
                variant={agrupacion === opcion.valor ? 'primary' : 'outline-primary'}
                onClick={() => setAgrupacion(opcion.valor)}
              >
                {opcion.texto}
              </Button>
            ))}
          </ButtonGroup>
        <SelectorPeriodo
          id="cumplimiento-checklist"
          rango={rango}
          onCambiar={setRango}
          accesosRapidos={false}
          fechaMinima={datos?.primera_fecha ?? undefined}
        />
        </div>
      </div>
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
              { titulo: 'Período', valor: (fila) => etiquetaPeriodo(fila.inicio, agrupacionDatos, true) },
              { titulo: 'Realizadas', valor: (fila) => formatearNumero(fila.realizadas), numerica: true },
              { titulo: 'Total', valor: (fila) => formatearNumero(fila.total), numerica: true },
              { titulo: 'Cumplimiento', valor: (fila) => textoPorcentaje(fila.porcentaje), numerica: true },
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
  );
}

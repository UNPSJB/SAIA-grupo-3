import { useState } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import {
  GraficoBarras,
  GraficoColumnas,
  IndicadorNumerico,
  SelectorPeriodo,
  TablaDatos,
  TarjetaGrafico,
  type DatoBarra,
  type PuntoSerie,
} from '../../../shared/components/graficos';
import { useRangoFechasUrl } from '../../../shared/hooks/useRangoFechasUrl';
import { textoRango, type RangoFechas } from '../../../shared/libreria/fechas';
import {
  etiquetaPeriodo,
  formatearDuracionHoras,
  formatearNumero,
} from '../../../shared/libreria/graficos';
import type { EstadisticaPorTipo, TipoIncidente } from '../types';
import { useEstadisticasIncidentes } from './useEstadisticasIncidentes';

const CLAVE_OCULTAS = 'saia:incidentes:estadisticas-ocultas';
const AGRUPACION_TEXTO = { dia: 'por día', semana: 'por semana', mes: 'por mes' } as const;

function leerOcultas(): boolean {
  try {
    return localStorage.getItem(CLAVE_OCULTAS) === 'true';
  } catch {
    return false;
  }
}

function guardarOcultas(valor: boolean) {
  try {
    localStorage.setItem(CLAVE_OCULTAS, String(valor));
  } catch {
    // Si el navegador bloquea el almacenamiento, solo se pierde la preferencia.
  }
}

function porcentaje(parte: number, total: number): string {
  return total ? `${formatearNumero((parte / total) * 100)} % del total` : '—';
}

interface PanelEstadisticasIncidentesProps {
  /** Tipo por el que está filtrado el listado (se resalta en el gráfico). */
  tipoSeleccionadoId: number | null;
  /** Click en una barra: filtrar el listado por ese tipo y período (null = quitar filtro). */
  onSeleccionarTipo: (tipo: TipoIncidente | null, rango: RangoFechas) => void;
}

/** Sector de gráficos del listado de incidentes (E7 - Estadística de incidentes por tipo). */
export function PanelEstadisticasIncidentes({
  tipoSeleccionadoId,
  onSeleccionarTipo,
}: PanelEstadisticasIncidentesProps) {
  const [ocultas, setOcultas] = useState(leerOcultas);
  const { rango, setRango } = useRangoFechasUrl('est', 30);
  const { datos, error, cargando } = useEstadisticasIncidentes(rango);

  const alternarOcultas = () => {
    setOcultas((valor) => {
      guardarOcultas(!valor);
      return !valor;
    });
  };

  const porTipo = [...(datos?.por_tipo ?? [])].sort(
    (a, b) => b.total - a.total || a.tipo.nombre.localeCompare(b.tipo.nombre),
  );
  const barras: DatoBarra[] = porTipo.map((item) => ({
    id: item.tipo.id,
    etiqueta: item.tipo.activo ? item.tipo.nombre : `${item.tipo.nombre} (de baja)`,
    valor: item.total,
    color: item.tipo.color,
    detalle: [
      { etiqueta: 'Abiertos', valor: formatearNumero(item.abiertos) },
      { etiqueta: 'Cerrados', valor: formatearNumero(item.cerrados) },
    ],
  }));
  const agrupacion = datos?.agrupacion ?? 'dia';
  const puntos: PuntoSerie[] = (datos?.evolucion ?? []).map((punto) => ({
    clave: punto.periodo,
    etiqueta: etiquetaPeriodo(punto.periodo, agrupacion),
    etiquetaLarga: etiquetaPeriodo(punto.periodo, agrupacion, true),
    valor: punto.cantidad,
  }));
  const sinIncidentes = !datos || datos.total === 0;
  const tipoSeleccionado =
    porTipo.find((item) => item.tipo.id === tipoSeleccionadoId)?.tipo ?? null;

  const seleccionarBarra = (dato: DatoBarra) => {
    const item = porTipo.find((tipo) => tipo.tipo.id === dato.id);
    if (!item) return;
    onSeleccionarTipo(item.tipo.id === tipoSeleccionadoId ? null : item.tipo, rango);
  };

  return (
    <section className="mb-4" aria-labelledby="titulo-estadisticas-incidentes">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 id="titulo-estadisticas-incidentes" className="mb-0 text-secondary">
          <i className="bi bi-bar-chart-line me-2" aria-hidden="true" />
          Estadísticas
        </h5>
        <div className="d-flex flex-wrap align-items-center gap-2 col-12 col-sm-auto justify-content-sm-end">
          {!ocultas && (
            <SelectorPeriodo id="estadisticas-incidentes" rango={rango} onCambiar={setRango} />
          )}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={alternarOcultas}
            aria-expanded={!ocultas}
            aria-controls="contenido-estadisticas-incidentes"
          >
            <i
              className={`bi ${ocultas ? 'bi-chevron-down' : 'bi-chevron-up'} me-1`}
              aria-hidden="true"
            />
            {ocultas ? 'Mostrar' : 'Ocultar'}
          </Button>
        </div>
      </div>

      {!ocultas && (
        <div id="contenido-estadisticas-incidentes">
          <Row xs={2} lg={4} className="g-3 mb-3">
            <Col>
              <IndicadorNumerico
                titulo="Incidentes del período"
                icono="bi-clipboard-data"
                variante="primary"
                valor={datos ? formatearNumero(datos.total) : '—'}
                detalle={textoRango(rango)}
              />
            </Col>
            <Col>
              <IndicadorNumerico
                titulo="Abiertos"
                icono="bi-exclamation-circle"
                variante="warning"
                valor={datos ? formatearNumero(datos.abiertos) : '—'}
                detalle={datos ? porcentaje(datos.abiertos, datos.total) : undefined}
              />
            </Col>
            <Col>
              <IndicadorNumerico
                titulo="Cerrados"
                icono="bi-check-circle"
                variante="success"
                valor={datos ? formatearNumero(datos.cerrados) : '—'}
                detalle={datos ? porcentaje(datos.cerrados, datos.total) : undefined}
              />
            </Col>
            <Col>
              <IndicadorNumerico
                titulo="Tiempo promedio de resolución"
                icono="bi-stopwatch"
                variante="info"
                valor={datos ? formatearDuracionHoras(datos.promedio_horas_resolucion) : '—'}
                detalle="De los cerrados del período"
              />
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={7}>
              <TarjetaGrafico
                titulo="Incidentes por tipo"
                subtitulo="Tocá un tipo para ver sus incidentes en el listado"
                cargando={cargando}
                error={error}
                vacio={sinIncidentes}
                mensajeVacio="No se registraron incidentes en este período."
                tabla={
                  <TablaDatos<EstadisticaPorTipo>
                    filas={porTipo}
                    clave={(fila) => fila.tipo.id}
                    columnas={[
                      { titulo: 'Tipo', valor: (fila) => fila.tipo.nombre },
                      {
                        titulo: 'Total',
                        valor: (fila) => formatearNumero(fila.total),
                        numerica: true,
                      },
                      {
                        titulo: 'Abiertos',
                        valor: (fila) => formatearNumero(fila.abiertos),
                        numerica: true,
                      },
                      {
                        titulo: 'Cerrados',
                        valor: (fila) => formatearNumero(fila.cerrados),
                        numerica: true,
                      },
                    ]}
                  />
                }
              >
                <GraficoBarras
                  datos={barras}
                  nombreValor="Incidentes"
                  seleccionado={tipoSeleccionadoId}
                  onSeleccionar={seleccionarBarra}
                  textoAyuda="Click para filtrar el listado"
                />
                {tipoSeleccionado && (
                  <div className="d-flex flex-wrap align-items-center gap-2 mt-2 small">
                    <span className="text-body-secondary">
                      Listado filtrado por{' '}
                      <strong className="text-body">{tipoSeleccionado.nombre}</strong>
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0"
                      onClick={() => onSeleccionarTipo(null, rango)}
                    >
                      Quitar filtro
                    </Button>
                  </div>
                )}
              </TarjetaGrafico>
            </Col>
            <Col lg={5}>
              <TarjetaGrafico
                titulo="Evolución de incidentes"
                subtitulo={`Reportados ${AGRUPACION_TEXTO[agrupacion]}`}
                cargando={cargando}
                error={error}
                vacio={sinIncidentes}
                mensajeVacio="No se registraron incidentes en este período."
                tabla={
                  <TablaDatos<PuntoSerie>
                    filas={puntos}
                    clave={(fila) => fila.clave}
                    columnas={[
                      { titulo: 'Período', valor: (fila) => fila.etiquetaLarga ?? fila.etiqueta },
                      {
                        titulo: 'Incidentes',
                        valor: (fila) => formatearNumero(fila.valor),
                        numerica: true,
                      },
                    ]}
                  />
                }
              >
                <GraficoColumnas datos={puntos} nombreValor="Incidentes" />
              </TarjetaGrafico>
            </Col>
          </Row>
        </div>
      )}
    </section>
  );
}

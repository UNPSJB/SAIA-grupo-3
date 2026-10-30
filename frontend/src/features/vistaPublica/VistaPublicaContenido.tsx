import { Alert } from 'react-bootstrap';

import { INDICADORES_PUBLICOS, type DefinicionIndicador } from './indicadoresPublicos';
import type { IndicadorPublico, VistaPublicaDatos } from './vistaPublicaApi';

import './vistaPublica.css';

interface Props {
  datos: VistaPublicaDatos;
}

interface IndicadorConDefinicion {
  indicador: IndicadorPublico;
  definicion: DefinicionIndicador;
}

function textoValor(indicador: IndicadorPublico): string {
  if (indicador.porcentaje !== null && Number.isFinite(indicador.porcentaje)) {
    return `${new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 1,
    }).format(indicador.porcentaje)} %`;
  }

  const valor = indicador.valor;

  if (valor && /^\d+$/.test(valor)) {
    return new Intl.NumberFormat('es-AR').format(Number(valor));
  }

  return valor ?? 'Sin datos';
}

function TarjetaActividad({ indicador, definicion }: IndicadorConDefinicion) {
  return (
    <article className="vp-actividad">
      <i className={definicion.icono} aria-hidden="true" />

      <div>
        <p className="vp-numero">{textoValor(indicador)}</p>

        <h3>{indicador.titulo}</h3>

        <p className="vp-fecha">{indicador.descripcion}</p>
      </div>
    </article>
  );
}

function IndicadorConBarra({ indicador, definicion }: IndicadorConDefinicion) {
  const porcentaje = indicador.porcentaje;

  const tieneDatos = porcentaje !== null && Number.isFinite(porcentaje);

  const ancho = tieneDatos ? Math.min(100, Math.max(0, porcentaje)) : 0;

  return (
    <article className="vp-metrica">
      <div className="vp-metrica-titulo">
        <h3>{indicador.titulo}</h3>
        <span className="vp-porcentaje">{textoValor(indicador)}</span>
      </div>

      {tieneDatos && (
        <>
          <div
            className="vp-barra"
            role="meter"
            aria-label={indicador.titulo}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            aria-valuetext={textoValor(indicador)}
          >
            <div className="vp-barra-valor" style={{ width: `${ancho}%` }} />
          </div>

          <div className="vp-escala" aria-hidden="true">
            <span>0 %</span>
            <span>100 %</span>
          </div>
        </>
      )}

      <p>{definicion.descripcion}</p>
      <p className="vp-fecha">{indicador.descripcion}</p>
    </article>
  );
}

export function VistaPublicaContenido({ datos }: Props) {
  // Solo representa indicadores que llegaron desde el backend
  // y que además existen en el catálogo público.
  const publicados: IndicadorConDefinicion[] = datos.indicadores.flatMap((indicador) => {
    const definicion = INDICADORES_PUBLICOS.find((opcion) => opcion.codigo === indicador.codigo);

    return definicion ? [{ indicador, definicion }] : [];
  });

  const actividad = publicados.filter(({ definicion }) => definicion.categoria === 'actividad');

  const porcentajes = publicados.filter(({ definicion }) => definicion.categoria === 'porcentaje');

  const produccion = publicados.filter(({ definicion }) => definicion.categoria === 'produccion');

  const nombre =
    datos.establecimiento === 'SAIA' ? 'Nuestro establecimiento' : datos.establecimiento;

  return (
    <div className="vista-publica">
      <header className="vp-presentacion">
        <div className="vp-presentacion-interior">
          <div>
            <p className="vp-antetitulo">Buenas prácticas alimentarias</p>

            <h1>
              El cuidado empieza mucho antes de <span>tu mesa.</span>
            </h1>

            <p className="vp-introduccion">
              Compartimos información sobre las prácticas de nuestro establecimiento para que
              conozcas cómo registramos y seguimos nuestro trabajo cotidiano.
            </p>

            <p className="vp-establecimiento">
              <i className="bi bi-shop me-2" aria-hidden="true" />
              {nombre}
            </p>
          </div>

          <aside className="vp-proceso" aria-label="Cómo organizamos el trabajo">
            <div>
              <i className="bi bi-clipboard2-check" aria-hidden="true" />
              <p>
                <strong>Planificación</strong>
                Tareas y frecuencias organizadas en planes.
              </p>
            </div>

            <div>
              <i className="bi bi-journal-check" aria-hidden="true" />
              <p>
                <strong>Registro</strong>
                Constancia de las actividades realizadas.
              </p>
            </div>

            <div>
              <i className="bi bi-bar-chart-line" aria-hidden="true" />
              <p>
                <strong>Seguimiento</strong>
                Indicadores generales para conocer la actividad.
              </p>
            </div>
          </aside>
        </div>
      </header>

      <main className="vp-cuerpo">
        <section aria-label="Indicadores publicados">
          <div className="vp-seccion-titulo">
            <h2>Así se refleja nuestro trabajo</h2>
            <p>
              Información agregada de las prácticas del establecimiento. Cada indicador muestra su
              período o fecha de consulta.
            </p>
          </div>

          {publicados.length === 0 ? (
            <Alert variant="secondary">No hay indicadores publicados por el momento.</Alert>
          ) : (
            <>
              {actividad.length > 0 && (
                <div className="vp-actividades">
                  {actividad.map((item) => (
                    <TarjetaActividad key={item.indicador.codigo} {...item} />
                  ))}
                </div>
              )}

              {(porcentajes.length > 0 || produccion.length > 0) && (
                <section className="vp-panel" aria-label="Seguimiento de buenas prácticas">
                  <div className="vp-panel-titulo">
                    <h2>Seguimiento de buenas prácticas</h2>

                    {porcentajes.length > 0 && <span>Barras con escala de 0 a 100 %</span>}
                  </div>

                  <div className="vp-metricas">
                    {porcentajes.map((item) => (
                      <IndicadorConBarra key={item.indicador.codigo} {...item} />
                    ))}

                    {produccion.length > 0 && (
                      <section className="vp-elaboracion" aria-label="Nuestra producción">
                        <header className="vp-elaboracion-header">
                          <div>
                            <p className="vp-elaboracion-antetitulo">
                              <i className="bi bi-basket2 me-2" aria-hidden="true" />
                              Del establecimiento a tu mesa
                            </p>
                            <h3>Nuestra producción</h3>
                            <p className="vp-elaboracion-intro">
                              Lo que elaboramos también cuenta nuestra historia. Este es el resumen
                              de los últimos 30 días completos.
                            </p>
                          </div>
                          <p className="vp-elaboracion-fecha">
                            <i className="bi bi-calendar3 me-2" aria-hidden="true" />
                            {produccion[0].indicador.descripcion}
                          </p>
                        </header>

                        <div className="vp-elaboracion-tarjetas">
                          {produccion.map(({ indicador, definicion }) => (
                            <article key={indicador.codigo} className="vp-elaboracion-tarjeta">
                              <div className="vp-elaboracion-valor">
                                <span className="vp-elaboracion-icono">
                                  <i className={definicion.icono} aria-hidden="true" />
                                </span>
                                <p className="vp-elaboracion-numero">{textoValor(indicador)}</p>
                              </div>
                              <h4>{indicador.titulo}</h4>
                              <p className="vp-elaboracion-descripcion">
                                {indicador.codigo === 'productos_elaborados'
                                  ? 'Variedades de productos con elaboración registrada en los lotes finalizados del período.'
                                  : 'Lotes que se registraron como cerrados durante el período indicado.'}
                              </p>
                            </article>
                          ))}
                        </div>

                        <p className="vp-elaboracion-nota">
                          <i className="bi bi-journal-check me-2" aria-hidden="true" />
                          Información agregada de los registros de elaboración. Solo se consideran
                          lotes activos y cerrados.
                        </p>
                        <details className="vp-elaboracion-detalle">
                          <summary>¿Qué cuentan estos números?</summary>
                          <p>
                            Los productos cuentan variedades diferentes, no cantidades de unidades,
                            kilos o litros. Los lotes se cuentan por su fecha de cierre; varios lotes
                            pueden corresponder al mismo producto.
                          </p>
                        </details>
                      </section>
                    )}
                  </div>

                  {porcentajes.length > 0 && (
                    <p className="vp-aclaracion">
                      Cada porcentaje describe un aspecto diferente. No se suman ni forman una
                      calificación general.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </section>

        <section className="vp-contexto" aria-label="Sobre la información publicada">
          <div>
            <p className="vp-antetitulo">Del establecimiento a vos</p>

            <h2>Qué hay detrás de estos números</h2>

            <p>
              La elaboración de alimentos requiere organizar las tareas de limpieza, llevar
              registros y mantener controles sobre los procesos y los equipos.
            </p>

            <p>
              Esta página reúne los indicadores que el establecimiento decidió compartir. No muestra
              datos del personal, documentos internos ni detalles de incidentes.
            </p>
          </div>

          <div>
            <details>
              <summary>¿De dónde sale la información?</summary>
              <p>
                De los registros cargados por el establecimiento en SAIA. Solo se publican los
                indicadores habilitados por su administración.
              </p>
            </details>

            <details>
              <summary>¿Qué significa “Sin datos”?</summary>
              <p>
                No existen registros suficientes o elementos aplicables para calcular ese indicador.
                No equivale a un cumplimiento del 0 %.
              </p>
            </details>

            <details>
              <summary>¿Es una certificación sanitaria?</summary>
              <p>
                No. Estos indicadores describen registros del establecimiento y no reemplazan una
                inspección ni una certificación sanitaria.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="vp-pie">
        <span>{nombre}</span>
        <span>Información publicada con SAIA</span>
      </footer>
    </div>
  );
}

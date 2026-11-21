import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { TablaNutricional } from '../nutricion';
import { HECHOS, NUTRIENTES, RESULTADOS, SELLOS } from '../rotuladoFrontal/etiquetas';
import { EtiquetaRotulo } from './EtiquetaRotulo';
import type { Exportacion } from './types';

const numero = (valor: number | null | undefined, decimales = 1) =>
  valor === null || valor === undefined
    ? '—'
    : valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: decimales });

function Encabezado({ exportacion, titulo }: { exportacion: Exportacion; titulo: string }) {
  const conjunto = exportacion.anexo.rotulado_frontal?.calculo?.conjunto;
  return (
    <header className="exp-encabezado">
      <div className="exp-titulo">{titulo}</div>
      <dl className="exp-datos">
        <div>
          <dt>Producto</dt>
          <dd>{exportacion.producto.nombre}</dd>
        </div>
        <div>
          <dt>Exportación</dt>
          <dd>N° {exportacion.numero}</dd>
        </div>
        <div>
          <dt>Versión de receta</dt>
          <dd>v{exportacion.version_receta_numero}</dd>
        </div>
        <div>
          <dt>Parámetros de rotulado frontal</dt>
          <dd>
            {conjunto
              ? `v${conjunto.numero}${conjunto.fecha_vigencia ? ` (vigencia ${formatearFecha(conjunto.fecha_vigencia)})` : ''}`
              : 'No aplica'}
          </dd>
        </div>
        <div>
          <dt>Generado</dt>
          <dd>
            {formatearFechaHora(exportacion.generado_en)} por {exportacion.generado_por.nombre}{' '}
            {exportacion.generado_por.apellido}
          </dd>
        </div>
      </dl>
    </header>
  );
}

function Receta({ exportacion }: { exportacion: Exportacion }) {
  const { receta } = exportacion.anexo;
  return (
    <section className="exp-seccion">
      <h3>A. Receta (versión {receta.numero})</h3>
      <p className="exp-texto">
        Estado: {receta.estado} · creada el {formatearFechaHora(receta.fecha_creacion)} · motivo:{' '}
        {receta.motivo}
        <br />
        Rendimiento: {numero(receta.rendimiento_cantidad, 2)} {receta.rendimiento_unidad.sufijo}
        {receta.rendimiento_peso_g !== null && ` (${numero(receta.rendimiento_peso_g, 0)} g)`} ·
        Porción:{' '}
        {receta.porcion_cantidad !== null && receta.porcion_unidad
          ? `${numero(receta.porcion_cantidad, 2)} ${receta.porcion_unidad.sufijo}`
          : 'no declarada'}
        {receta.porcion_medida_casera && ` (${receta.porcion_medida_casera})`}
      </p>
      <table className="exp-tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Insumo</th>
            <th>Tipo</th>
            <th className="exp-num">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {receta.renglones.map((renglon) => (
            <tr key={renglon.id}>
              <td>{renglon.orden}</td>
              <td>
                {renglon.insumo.nombre}
                {renglon.aditivo_referencia && (
                  <span className="exp-sutil">
                    {' '}
                    · {renglon.aditivo_referencia.nombre}
                    {renglon.aditivo_referencia.ins && ` (INS ${renglon.aditivo_referencia.ins})`}
                  </span>
                )}
              </td>
              <td>{renglon.tipo === 'aditivo' ? 'Aditivo' : 'Ingrediente'}</td>
              <td className="exp-num">
                {numero(renglon.cantidad, 3)} {renglon.unidad_medida.sufijo}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ComposicionPorcentual({ exportacion }: { exportacion: Exportacion }) {
  const { composicion } = exportacion.anexo;
  const grupos = [
    ['Ingredientes', composicion.ingredientes],
    ['Aditivos', composicion.aditivos],
  ] as const;
  return (
    <section className="exp-seccion">
      <h3>B. Composición porcentual</h3>
      {!composicion.completa && (
        <p className="exp-alerta">
          Composición incompleta: hay insumos sin equivalencia en gramos.
        </p>
      )}
      <table className="exp-tabla">
        <thead>
          <tr>
            <th>Insumo</th>
            <th className="exp-num">Gramos</th>
            <th className="exp-num">% del total</th>
          </tr>
        </thead>
        {grupos.map(([titulo, grupo]) =>
          grupo.renglones.length === 0 ? null : (
            <tbody key={titulo}>
              <tr className="exp-subtitulo">
                <td colSpan={3}>{titulo}</td>
              </tr>
              {[...grupo.renglones]
                .sort((a, b) => (b.porcentaje ?? -1) - (a.porcentaje ?? -1))
                .map((renglon) => (
                  <tr key={renglon.renglon_id}>
                    <td>{renglon.insumo.nombre}</td>
                    <td className="exp-num">{numero(renglon.gramos, 2)}</td>
                    <td className="exp-num">{numero(renglon.porcentaje, 2)} %</td>
                  </tr>
                ))}
              <tr className="exp-total">
                <td>Subtotal</td>
                <td className="exp-num">{numero(grupo.subtotal_gramos, 2)}</td>
                <td className="exp-num">{numero(grupo.subtotal_porcentaje, 2)} %</td>
              </tr>
            </tbody>
          ),
        )}
        <tfoot>
          <tr className="exp-total">
            <td>Total</td>
            <td className="exp-num">{numero(composicion.total_gramos, 2)}</td>
            <td className="exp-num">{numero(composicion.suma_porcentajes, 2)} %</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function Nutricional({ exportacion }: { exportacion: Exportacion }) {
  const { informacion_nutricional: info, fuentes } = exportacion.anexo;
  return (
    <section className="exp-seccion">
      <h3>C. Información nutricional y fuentes de datos</h3>
      <p className="exp-texto">
        Calculada el {formatearFechaHora(info.calculada_en)} a partir de la receta v{info.numero}.
      </p>
      <div className="exp-tabla-nutricional">
        <TablaNutricional info={info} />
      </div>
      {info.faltantes.length > 0 && (
        <div className="exp-alerta">
          Datos faltantes:
          <ul className="mb-0">
            {info.faltantes.map((faltante, indice) => (
              <li key={indice}>{faltante.mensaje}</li>
            ))}
          </ul>
        </div>
      )}
      <h4>Fuente de los valores de cada insumo</h4>
      <table className="exp-tabla">
        <thead>
          <tr>
            <th>Insumo</th>
            <th className="exp-num">%</th>
            <th>Fuente</th>
            <th>Detalle / referencia</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {fuentes.map((fuente) => (
            <tr key={fuente.insumo_id}>
              <td>{fuente.insumo}</td>
              <td className="exp-num">{numero(fuente.porcentaje, 2)}</td>
              <td>
                {fuente.fuentes.length ? (
                  fuente.fuentes.join(', ')
                ) : (
                  <span className="exp-falta">Sin datos</span>
                )}
                {fuente.nutrientes_cargados > 0 && (
                  <span className="exp-sutil"> ({fuente.nutrientes_cargados} nutrientes)</span>
                )}
              </td>
              <td>{[...fuente.alimentos_referencia, ...fuente.detalles].join(' · ') || '—'}</td>
              <td className="text-nowrap">
                {fuente.actualizado_en ? formatearFecha(fuente.actualizado_en) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Sellos({ exportacion }: { exportacion: Exportacion }) {
  const frontal = exportacion.anexo.rotulado_frontal;
  const calculo = frontal?.calculo;
  return (
    <section className="exp-seccion">
      <h3>D. Rotulado frontal: cálculo de sellos</h3>
      {!frontal ? (
        <p className="exp-texto">El módulo de rotulado frontal no está activo en el sistema.</p>
      ) : (
        <>
          <p className="exp-texto">
            Aplicabilidad:{' '}
            {frontal.aplicabilidad
              ? `${RESULTADOS[frontal.aplicabilidad.resultado].etiqueta}. ${frontal.aplicabilidad.mensaje}`
              : 'sin evaluar'}
          </p>
          {calculo ? (
            <>
              <p className="exp-texto">
                Parámetros v{calculo.conjunto.numero} «{calculo.conjunto.nombre}»
                {calculo.conjunto.fecha_vigencia &&
                  `, vigencia ${formatearFecha(calculo.conjunto.fecha_vigencia)}`}
                <br />
                Norma de origen: {calculo.conjunto.norma_origen}
                <br />
                Calculado el {formatearFechaHora(calculo.calculado_en)} con la receta v
                {calculo.version_receta.numero}
                {calculo.base && ` · base: por 100 ${calculo.base}`}
                {calculo.provisorio && ' · PROVISORIO (información nutricional incompleta)'}
                {calculo.hechos.length > 0 && (
                  <>
                    <br />
                    Hechos considerados: {calculo.hechos.map((hecho) => HECHOS[hecho]).join('; ')}
                  </>
                )}
              </p>
              {frontal.avisos.length > 0 && (
                <div className="exp-alerta">
                  <ul className="mb-0">
                    {frontal.avisos.map((aviso) => (
                      <li key={aviso}>{aviso}</li>
                    ))}
                  </ul>
                </div>
              )}
              <table className="exp-tabla">
                <thead>
                  <tr>
                    <th>Sello</th>
                    <th>Nutriente</th>
                    <th>Cálculo</th>
                    <th className="exp-num">Límite</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {calculo.detalle.map((detalle) => (
                    <tr key={`${detalle.orden}-${detalle.sello}`}>
                      <td>{SELLOS[detalle.sello]}</td>
                      <td>{NUTRIENTES[detalle.nutriente]}</td>
                      <td>
                        {detalle.evaluado
                          ? (detalle.operacion ?? numero(detalle.valor, 2))
                          : detalle.motivo}
                      </td>
                      <td className="exp-num">
                        {detalle.simbolo} {numero(detalle.limite, 2)} {detalle.unidad}
                      </td>
                      <td>
                        {!detalle.evaluado
                          ? 'No evaluado'
                          : detalle.supera
                            ? 'Supera'
                            : 'No supera'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="exp-texto">
                Sellos resultantes:{' '}
                {calculo.leyendas.length ? calculo.leyendas.join(' · ') : 'ninguno'}
                {calculo.advertencias.length > 0 && (
                  <>
                    <br />
                    Leyendas precautorias: {calculo.advertencias.join(' · ')}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="exp-texto">No hay sellos calculados para el producto.</p>
          )}
        </>
      )}
    </section>
  );
}

function Hoja({
  leyenda,
  className = '',
  children,
}: {
  leyenda: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <table className={`exp-hoja ${className}`}>
      <thead>
        <tr>
          <td>
            <div className="exp-leyenda-pagina">{leyenda}</div>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function DocumentoExportacion({ exportacion }: { exportacion: Exportacion }) {
  const leyenda = exportacion.vista_previa.leyenda_borrador;
  return (
    <div className="exp-documento">
      <Hoja leyenda={leyenda}>
        <Encabezado exportacion={exportacion} titulo="Borrador de rótulo" />
        {exportacion.vista_previa.advertencias.length > 0 && (
          <div className="exp-alerta">
            <strong>El rótulo no está listo para revisión:</strong>
            <ul className="mb-0">
              {exportacion.vista_previa.advertencias.map((advertencia) => (
                <li key={advertencia}>{advertencia}</li>
              ))}
            </ul>
          </div>
        )}
        <EtiquetaRotulo vista={exportacion.vista_previa} />
      </Hoja>
      <Hoja leyenda={leyenda} className="exp-anexo">
        <Encabezado exportacion={exportacion} titulo="Anexo: respaldo de los cálculos" />
        <Receta exportacion={exportacion} />
        <ComposicionPorcentual exportacion={exportacion} />
        <Nutricional exportacion={exportacion} />
        <Sellos exportacion={exportacion} />
      </Hoja>
    </div>
  );
}

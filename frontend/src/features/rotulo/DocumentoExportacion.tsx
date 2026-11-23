import { ReporteImpresion } from '../../shared/components/ReporteImpresion';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { formatearNumero } from '../../shared/libreria/formato';
import { TablaNutricional } from '../nutricion';
import { HECHOS, NUTRIENTES, RESULTADOS, SELLOS } from '../rotuladoFrontal/etiquetas';
import { EtiquetaRotulo } from './EtiquetaRotulo';
import type { Exportacion } from './types';

function metadatosExportacion(exportacion: Exportacion) {
  const conjunto = exportacion.anexo.rotulado_frontal?.calculo?.conjunto;
  return [
    { etiqueta: 'Producto', valor: exportacion.producto.nombre },
    { etiqueta: 'Exportación', valor: `N° ${exportacion.numero}` },
    { etiqueta: 'Versión de receta', valor: `v${exportacion.version_receta_numero}` },
    {
      etiqueta: 'Parámetros de rotulado frontal',
      valor: conjunto
        ? `v${conjunto.numero}${conjunto.fecha_vigencia ? ` (vigencia ${formatearFecha(conjunto.fecha_vigencia)})` : ''}`
        : 'No aplica',
    },
  ];
}

function Receta({ exportacion }: { exportacion: Exportacion }) {
  const { receta } = exportacion.anexo;
  return (
    <section className="rep-seccion">
      <h3>A. Receta (versión {receta.numero})</h3>
      <p className="rep-texto">
        Estado: {receta.estado} · creada el {formatearFechaHora(receta.fecha_creacion)} · motivo:{' '}
        {receta.motivo}
        <br />
        Rendimiento: {formatearNumero(receta.rendimiento_cantidad, 2)}{' '}
        {receta.rendimiento_unidad.sufijo}
        {receta.rendimiento_peso_g !== null &&
          ` (${formatearNumero(receta.rendimiento_peso_g, 0)} g)`}{' '}
        · Porción:{' '}
        {receta.porcion_cantidad !== null && receta.porcion_unidad
          ? `${formatearNumero(receta.porcion_cantidad, 2)} ${receta.porcion_unidad.sufijo}`
          : 'no declarada'}
        {receta.porcion_medida_casera && ` (${receta.porcion_medida_casera})`}
      </p>
      <table className="rep-tabla">
        <thead>
          <tr>
            <th style={{ width: '6%' }}>#</th>
            <th style={{ width: '54%' }}>Insumo</th>
            <th style={{ width: '18%' }}>Tipo</th>
            <th className="rep-num" style={{ width: '22%' }}>
              Cantidad
            </th>
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
              <td className="rep-num">
                {formatearNumero(renglon.cantidad, 3)} {renglon.unidad_medida.sufijo}
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
    <section className="rep-seccion">
      <h3>B. Composición porcentual</h3>
      {!composicion.completa && (
        <p className="rep-alerta">
          Composición incompleta: hay insumos sin equivalencia en gramos.
        </p>
      )}
      <table className="rep-tabla">
        <thead>
          <tr>
            <th style={{ width: '58%' }}>Insumo</th>
            <th className="rep-num" style={{ width: '21%' }}>
              Gramos
            </th>
            <th className="rep-num" style={{ width: '21%' }}>
              % del total
            </th>
          </tr>
        </thead>
        {grupos.map(([titulo, grupo]) =>
          grupo.renglones.length === 0 ? null : (
            <tbody key={titulo}>
              <tr className="rep-subtitulo-fila">
                <td colSpan={3}>{titulo}</td>
              </tr>
              {[...grupo.renglones]
                .sort((a, b) => (b.porcentaje ?? -1) - (a.porcentaje ?? -1))
                .map((renglon) => (
                  <tr key={renglon.renglon_id}>
                    <td>{renglon.insumo.nombre}</td>
                    <td className="rep-num">{formatearNumero(renglon.gramos, 2)}</td>
                    <td className="rep-num">{formatearNumero(renglon.porcentaje, 2)} %</td>
                  </tr>
                ))}
              <tr className="rep-total">
                <td>Subtotal</td>
                <td className="rep-num">{formatearNumero(grupo.subtotal_gramos, 2)}</td>
                <td className="rep-num">{formatearNumero(grupo.subtotal_porcentaje, 2)} %</td>
              </tr>
            </tbody>
          ),
        )}
        <tfoot>
          <tr className="rep-total">
            <td>Total</td>
            <td className="rep-num">{formatearNumero(composicion.total_gramos, 2)}</td>
            <td className="rep-num">{formatearNumero(composicion.suma_porcentajes, 2)} %</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function Nutricional({ exportacion }: { exportacion: Exportacion }) {
  const { informacion_nutricional: info, fuentes } = exportacion.anexo;
  return (
    <section className="rep-seccion">
      <h3>C. Información nutricional y fuentes de datos</h3>
      <p className="rep-texto">
        Calculada el {formatearFechaHora(info.calculada_en)} a partir de la receta v{info.numero}.
      </p>
      <div className="exp-tabla-nutricional">
        <TablaNutricional info={info} />
      </div>
      {info.faltantes.length > 0 && (
        <div className="rep-alerta">
          Datos faltantes:
          <ul className="mb-0">
            {info.faltantes.map((faltante, indice) => (
              <li key={indice}>{faltante.mensaje}</li>
            ))}
          </ul>
        </div>
      )}
      <h4>Fuente de los valores de cada insumo</h4>
      <table className="rep-tabla">
        <thead>
          <tr>
            <th style={{ width: '22%' }}>Insumo</th>
            <th className="rep-num" style={{ width: '9%' }}>
              %
            </th>
            <th style={{ width: '24%' }}>Fuente</th>
            <th style={{ width: '32%' }}>Detalle / referencia</th>
            <th style={{ width: '13%' }}>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {fuentes.map((fuente) => (
            <tr key={fuente.insumo_id}>
              <td>{fuente.insumo}</td>
              <td className="rep-num">{formatearNumero(fuente.porcentaje, 2)}</td>
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
    <section className="rep-seccion">
      <h3>D. Rotulado frontal: cálculo de sellos</h3>
      {!frontal ? (
        <p className="rep-texto">El módulo de rotulado frontal no está activo en el sistema.</p>
      ) : (
        <>
          <p className="rep-texto">
            Aplicabilidad:{' '}
            {frontal.aplicabilidad
              ? `${RESULTADOS[frontal.aplicabilidad.resultado].etiqueta}. ${frontal.aplicabilidad.mensaje}`
              : 'sin evaluar'}
          </p>
          {calculo ? (
            <>
              <p className="rep-texto">
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
                <div className="rep-alerta">
                  <ul className="mb-0">
                    {frontal.avisos.map((aviso) => (
                      <li key={aviso}>{aviso}</li>
                    ))}
                  </ul>
                </div>
              )}
              <table className="rep-tabla">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Sello</th>
                    <th style={{ width: '18%' }}>Nutriente</th>
                    <th style={{ width: '30%' }}>Cálculo</th>
                    <th className="rep-num" style={{ width: '20%' }}>
                      Límite
                    </th>
                    <th style={{ width: '14%' }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {calculo.detalle.map((detalle) => (
                    <tr key={`${detalle.orden}-${detalle.sello}`}>
                      <td>{SELLOS[detalle.sello]}</td>
                      <td>{NUTRIENTES[detalle.nutriente]}</td>
                      <td>
                        {detalle.evaluado
                          ? (detalle.operacion ?? formatearNumero(detalle.valor, 2))
                          : detalle.motivo}
                      </td>
                      <td className="rep-num">
                        {detalle.simbolo} {formatearNumero(detalle.limite, 2)} {detalle.unidad}
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
              <p className="rep-texto">
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
            <p className="rep-texto">No hay sellos calculados para el producto.</p>
          )}
        </>
      )}
    </section>
  );
}

export function DocumentoExportacion({ exportacion }: { exportacion: Exportacion }) {
  const leyenda = exportacion.vista_previa.leyenda_borrador;
  const establecimiento = exportacion.vista_previa.borrador.razon_social;
  const metadatos = metadatosExportacion(exportacion);

  return (
    <div className="exp-documento">
      <ReporteImpresion
        titulo="Borrador de rótulo"
        establecimiento={establecimiento}
        fechaEmision={exportacion.generado_en}
        usuario={exportacion.generado_por}
        metadatos={metadatos}
        leyendaSuperior={leyenda}
      >
        {exportacion.vista_previa.advertencias.length > 0 && (
          <div className="rep-alerta">
            <strong>El rótulo no está listo para revisión:</strong>
            <ul className="mb-0">
              {exportacion.vista_previa.advertencias.map((advertencia) => (
                <li key={advertencia}>{advertencia}</li>
              ))}
            </ul>
          </div>
        )}
        <EtiquetaRotulo vista={exportacion.vista_previa} />
      </ReporteImpresion>

      <ReporteImpresion
        titulo="Anexo: respaldo de los cálculos"
        establecimiento={establecimiento}
        fechaEmision={exportacion.generado_en}
        usuario={exportacion.generado_por}
        metadatos={metadatos}
        leyendaSuperior={leyenda}
        saltoDePagina
      >
        <Receta exportacion={exportacion} />
        <ComposicionPorcentual exportacion={exportacion} />
        <Nutricional exportacion={exportacion} />
        <Sellos exportacion={exportacion} />
      </ReporteImpresion>
    </div>
  );
}
import { ReporteImpresion, type UsuarioReporte } from '../../shared/components/ReporteImpresion';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { formatearNumero } from '../../shared/libreria/formato';
import { CodigoBarras } from './CodigoBarras';
import { ESTADOS_LOTE } from './estados';
import type { EquipoExpediente, ExpedienteLote } from './expedienteTypes';

interface ExpedienteDocumentoProps {
  expediente: ExpedienteLote;
  usuario: UsuarioReporte | null;
  fechaEmision?: string | null;
}

function persona(datos: { apellido: string; nombre: string } | null): string {
  return datos ? `${datos.apellido}, ${datos.nombre}` : '—';
}

function temperatura(valor: number | null): string {
  return valor === null ? '—' : `${formatearNumero(valor, 1)} °C`;
}

function estadoCalibracion(equipo: EquipoExpediente): string {
  if (!equipo.requiere_calibracion) return 'No requiere';
  if (!equipo.fecha_calibracion) return 'Sin calibración registrada';
  return equipo.calibracion_vigente ? 'Vigente' : 'Vencida';
}

export function ExpedienteDocumento({ expediente, usuario, fechaEmision }: ExpedienteDocumentoProps) {
  const { lote, insumos, pasos, equipos, incidentes, alertas } = expediente;
  const unidad = lote.producto.unidad_medida.sufijo;
  const pasosConMovimientos = pasos.filter((paso) => paso.movimientos.length > 0);
  const equiposConTemperaturas = equipos.filter((equipo) => equipo.temperaturas.length > 0);

  return (
    <ReporteImpresion
      titulo="Expediente de trazabilidad del lote"
      subtitulo={`${lote.codigo} · ${lote.producto.nombre}`}
      fechaEmision={fechaEmision}
      usuario={usuario}
      metadatos={[
        { etiqueta: 'Estado del lote', valor: ESTADOS_LOTE[lote.estado].etiqueta },
        { etiqueta: 'Fecha de producción', valor: formatearFecha(lote.fecha_produccion) },
        { etiqueta: 'Código de barras', valor: lote.codigo_barras ?? 'Sin asignar' },
      ]}
      pieNota="Los incidentes se listan por la fecha de producción porque hoy no se registran vinculados a un lote ni a un equipo."
    >
      {lote.codigo_barras && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.3cm' }}>
          <CodigoBarras codigo={lote.codigo_barras} modulo={1.5} alto={44} />
        </div>
      )}

      {alertas.length > 0 ? (
        <div className="rep-alerta">
          <strong>Alertas detectadas ({alertas.length})</strong>
          <ol style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            {alertas.map((alerta) => (
              <li key={`${alerta.tipo}-${alerta.mensaje}`}>{alerta.mensaje}</li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="rep-texto">No se detectaron alertas en este lote.</p>
      )}

      <section className="rep-seccion">
        <h3>1. Datos del lote</h3>
        <table className="rep-tabla">
          <tbody>
            <tr>
              <th style={{ width: '30%' }}>Producto</th>
              <td>{lote.producto.nombre}</td>
            </tr>
            <tr>
              <th>Fecha de producción</th>
              <td>{formatearFecha(lote.fecha_produccion)}</td>
            </tr>
            <tr>
              <th>Cantidad</th>
              <td>
                {formatearNumero(lote.cantidad)} {unidad}
              </td>
            </tr>
            <tr>
              <th>Registrado por</th>
              <td>
                {persona(lote.registrado_por)} · {formatearFechaHora(lote.fecha_registro)}
              </td>
            </tr>
            <tr>
              <th>Receta aplicada</th>
              <td>
                {lote.version_receta
                  ? `Versión ${lote.version_receta.numero}${lote.factor_receta !== null ? ` · factor ×${formatearNumero(lote.factor_receta)}` : ''}`
                  : 'Sin receta vinculada'}
              </td>
            </tr>
            <tr>
              <th>Cierre</th>
              <td>
                {lote.cerrado_por
                  ? `${persona(lote.cerrado_por)} · ${formatearFechaHora(lote.fecha_cierre)}`
                  : 'Sin cerrar'}
              </td>
            </tr>
            {lote.pasos_pendientes_al_cerrar ? (
              <tr>
                <th>Cerrado con pasos pendientes</th>
                <td>
                  {lote.pasos_pendientes_al_cerrar} paso(s). Motivo:{' '}
                  {lote.motivo_cierre_pendientes ?? '—'}
                </td>
              </tr>
            ) : null}
            <tr>
              <th>Anulación</th>
              <td>
                {lote.estado === 'anulado'
                  ? `${persona(lote.anulado_por)} · ${formatearFechaHora(lote.fecha_anulacion)} · Motivo: ${lote.motivo_anulacion ?? '—'}`
                  : 'No anulado'}
              </td>
            </tr>
            <tr>
              <th>Observaciones</th>
              <td>{lote.observaciones ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="rep-seccion">
        <h3>2. Insumos y origen</h3>
        {insumos.length === 0 ? (
          <p className="rep-texto">Este lote no tiene insumos asociados.</p>
        ) : (
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Lote de proveedor</th>
                <th>Proveedor</th>
                <th>Recepción / vencimiento</th>
                <th className="rep-num">Cantidad usada</th>
              </tr>
            </thead>
            <tbody>
              {insumos.flatMap((insumo) => [
                ...insumo.lotes_recepcion.map((recepcion) => (
                  <tr key={`${insumo.insumo_id}-${recepcion.lote_recepcion_id}`}>
                    <td>{insumo.insumo_nombre}</td>
                    <td>{recepcion.numero_lote}</td>
                    <td>{recepcion.proveedor_nombre}</td>
                    <td>
                      {formatearFecha(recepcion.fecha_recepcion)} /{' '}
                      {formatearFecha(recepcion.fecha_vencimiento)}
                    </td>
                    <td className="rep-num">
                      {formatearNumero(recepcion.cantidad_utilizada)} {insumo.unidad}
                    </td>
                  </tr>
                )),
                ...(insumo.cantidad_stock_anterior > 0
                  ? [
                      <tr key={`${insumo.insumo_id}-stock`} className="rep-subtitulo-fila">
                        <td>{insumo.insumo_nombre}</td>
                        <td colSpan={3}>Stock anterior sin lote identificado</td>
                        <td className="rep-num">
                          {formatearNumero(insumo.cantidad_stock_anterior)} {insumo.unidad}
                        </td>
                      </tr>,
                    ]
                  : []),
                ...(insumo.cantidad_historica_sin_origen > 0
                  ? [
                      <tr key={`${insumo.insumo_id}-historico`} className="rep-subtitulo-fila">
                        <td>{insumo.insumo_nombre}</td>
                        <td colSpan={3}>Registro histórico sin lote de recepción</td>
                        <td className="rep-num">
                          {formatearNumero(insumo.cantidad_historica_sin_origen)} {insumo.unidad}
                        </td>
                      </tr>,
                    ]
                  : []),
              ])}
            </tbody>
          </table>
        )}
      </section>

      <section className="rep-seccion">
        <h3>3. Pasos de elaboración</h3>
        {pasos.length === 0 ? (
          <p className="rep-texto">Este lote no tiene pasos de elaboración.</p>
        ) : (
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Paso</th>
                <th>Equipo</th>
                <th className="rep-num">Esperado</th>
                <th className="rep-num">Medido</th>
                <th>Responsable</th>
                <th>Fecha y hora</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pasos.map((paso) => (
                <tr key={paso.orden} className={paso.fuera_de_rango ? 'rep-subtitulo-fila' : undefined}>
                  <td>{paso.orden}</td>
                  <td>
                    {paso.nombre}
                    {paso.punto_control ? ' (punto de control)' : ''}
                  </td>
                  <td>{paso.equipo ?? '—'}</td>
                  <td className="rep-num">{temperatura(paso.temperatura_esperada)}</td>
                  <td className="rep-num">
                    {paso.valor_medido === null ? '—' : formatearNumero(paso.valor_medido, 1)}
                    {paso.fuera_de_rango ? ' · fuera de rango' : ''}
                  </td>
                  <td>{paso.realizado_por ?? '—'}</td>
                  <td>{paso.realizado_en ? formatearFechaHora(paso.realizado_en) : '—'}</td>
                  <td>{paso.estado === 'realizado' ? 'Realizado' : 'Pendiente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pasosConMovimientos.map((paso) => (
          <div key={`historial-${paso.orden}`}>
            <h4>
              Historial del paso {paso.orden} · {paso.nombre}
            </h4>
            <table className="rep-tabla">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Fecha y hora</th>
                  <th style={{ width: '22%' }}>Responsable</th>
                  <th style={{ width: '14%' }}>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {paso.movimientos.map((movimiento, indice) => (
                  <tr key={`${movimiento.fecha_hora}-${indice}`}>
                    <td>{formatearFechaHora(movimiento.fecha_hora)}</td>
                    <td>{movimiento.personal}</td>
                    <td>{movimiento.accion === 'realizado' ? 'Realizado' : 'Anulado'}</td>
                    <td>
                      {[
                        movimiento.valor_medido !== null
                          ? `Valor medido ${formatearNumero(movimiento.valor_medido, 1)}`
                          : null,
                        movimiento.observacion,
                        movimiento.motivo ? `Motivo: ${movimiento.motivo}` : null,
                        movimiento.con_foto ? 'Foto adjunta' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="rep-seccion">
        <h3>4. Equipos utilizados</h3>
        {equipos.length === 0 ? (
          <p className="rep-texto">Los pasos del lote no tienen equipos asignados.</p>
        ) : (
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Pasos</th>
                <th>Última calibración</th>
                <th>Vencimiento</th>
                <th>A la fecha de producción</th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((equipo) => (
                <tr
                  key={equipo.equipo_id}
                  className={
                    equipo.requiere_calibracion && !equipo.calibracion_vigente
                      ? 'rep-subtitulo-fila'
                      : undefined
                  }
                >
                  <td>{equipo.nombre}</td>
                  <td>{equipo.pasos.join(', ')}</td>
                  <td>{formatearFecha(equipo.fecha_calibracion, '—')}</td>
                  <td>{formatearFecha(equipo.fecha_vencimiento, '—')}</td>
                  <td>{estadoCalibracion(equipo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {equiposConTemperaturas.map((equipo) => (
          <div key={`temperaturas-${equipo.equipo_id}`}>
            <h4>
              Temperaturas del {formatearFecha(lote.fecha_produccion)} · {equipo.nombre}
            </h4>
            <table className="rep-tabla">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th className="rep-num">Temperatura</th>
                  <th>Fuera de rango</th>
                  <th>Registró</th>
                </tr>
              </thead>
              <tbody>
                {equipo.temperaturas.map((registro, indice) => (
                  <tr key={`${registro.fecha_hora}-${indice}`}>
                    <td>{formatearFechaHora(registro.fecha_hora)}</td>
                    <td className="rep-num">{temperatura(registro.temperatura)}</td>
                    <td>{registro.fuera_de_rango ? 'Sí' : 'No'}</td>
                    <td>{registro.operario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="rep-seccion">
        <h3>5. Incidentes del día (posiblemente relacionados)</h3>
        {incidentes.length === 0 ? (
          <p className="rep-texto">
            No se registraron incidentes el {formatearFecha(lote.fecha_produccion)}.
          </p>
        ) : (
          <table className="rep-tabla">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Fecha y hora</th>
                <th style={{ width: '16%' }}>Tipo</th>
                <th>Descripción</th>
                <th style={{ width: '11%' }}>Estado</th>
                <th style={{ width: '18%' }}>Reportó</th>
              </tr>
            </thead>
            <tbody>
              {incidentes.map((incidente) => (
                <tr key={incidente.id}>
                  <td>{formatearFechaHora(incidente.fecha_hora)}</td>
                  <td>{incidente.tipo}</td>
                  <td>{incidente.descripcion}</td>
                  <td>{incidente.estado === 'abierto' ? 'Abierto' : 'Cerrado'}</td>
                  <td>{incidente.reportado_por}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </ReporteImpresion>
  );
}

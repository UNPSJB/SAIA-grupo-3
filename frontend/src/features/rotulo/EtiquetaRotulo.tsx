import { formatearFecha } from '../../shared/libreria/fechas';
import { CodigoBarras } from '../lotesProduccion/CodigoBarras';
import { TablaNutricional } from '../nutricion';
import { LeyendaPrecautoria, Octogono } from '../rotuladoFrontal/Octogono';
import type { VistaPrevia } from './types';

const RESULTADO_FRONTAL = {
  no_corresponde: 'No corresponde rotulado frontal',
  exceptuado: 'Exceptuado del rotulado frontal',
};

function LeyendaBorrador({ texto }: { texto: string }) {
  return (
    <div className="vp-leyenda-borrador" role="note">
      {texto}
    </div>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return <div className="vp-nota">{children}</div>;
}

function Frontal({ vista }: { vista: VistaPrevia }) {
  const frontal = vista.borrador.rotulado_frontal;
  if (!frontal) return null;
  if (!frontal.resultado) return <Nota>Rotulado frontal sin evaluar</Nota>;
  if (frontal.resultado !== 'corresponde')
    return <Nota>{RESULTADO_FRONTAL[frontal.resultado]}</Nota>;
  if (!frontal.calculo_id)
    return <Nota>Corresponde rotulado frontal: falta calcular los sellos</Nota>;
  return (
    <div className="vp-sellos">
      {frontal.leyendas.length === 0 ? (
        <Nota>Corresponde rotulado frontal, pero no supera ningún límite: sin sellos</Nota>
      ) : (
        <div className="vp-octogonos">
          {frontal.leyendas.map((leyenda) => (
            <Octogono key={leyenda} leyenda={leyenda} tamano={86} />
          ))}
        </div>
      )}
      {frontal.advertencias.length > 0 && (
        <div className="vp-precautorias">
          {frontal.advertencias.map((advertencia) => (
            <LeyendaPrecautoria key={advertencia} texto={advertencia} />
          ))}
        </div>
      )}
      {frontal.provisorio && <Nota>Sellos provisorios: la tabla nutricional está incompleta</Nota>}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta?: string; valor: string | null | undefined }) {
  if (!valor) return <span className="vp-falta">{etiqueta ? `${etiqueta}: ` : ''}[falta]</span>;
  return (
    <span>
      {etiqueta && <span className="vp-etiqueta">{etiqueta}: </span>}
      {valor}
    </span>
  );
}

export function EtiquetaRotulo({ vista }: { vista: VistaPrevia }) {
  const b = vista.borrador;
  const fecha = vista.fecha_duracion;
  const registro =
    b.tipo_registro && b.numero_registro
      ? `${b.tipo_registro.toUpperCase()} N° ${b.numero_registro}`
      : null;
  const ingredientes = b.lista_ingredientes?.trim() ?? '';
  const textoIngredientes = /^ingredientes\s*:/i.test(ingredientes)
    ? ingredientes
    : ingredientes
      ? `Ingredientes: ${ingredientes}`
      : null;

  return (
    <div className="vp-rotulo">
      <section className="vp-cara" aria-label="Cara principal">
        <div className="vp-cara-titulo">Cara principal</div>
        <div className="vp-panel vp-principal">
          <LeyendaBorrador texto={vista.leyenda_borrador} />
          <div className="vp-principal-cuerpo">
            <div className="vp-zona-sellos">
              <Frontal vista={vista} />
            </div>
            <div className="vp-denominacion">
              <Dato valor={b.denominacion_venta} />
            </div>
            <div className="vp-contenido">
              <Dato etiqueta="Contenido neto" valor={vista.contenido_neto_texto} />
            </div>
          </div>
        </div>
      </section>

      <section className="vp-cara" aria-label="Resto del envase">
        <div className="vp-cara-titulo">Resto del envase</div>
        <div className="vp-panel vp-resto">
          <LeyendaBorrador texto={vista.leyenda_borrador} />
          <div className="vp-resto-cuerpo">
            <div className="vp-texto">
              <p className="mb-1">
                <Dato
                  valor={textoIngredientes}
                  etiqueta={textoIngredientes ? undefined : 'Ingredientes'}
                />
              </p>
              {(b.alergenos.texto_contiene || b.alergenos.texto_puede_contener) && (
                <p className="vp-alergenos">
                  {b.alergenos.texto_contiene && (
                    <span className="d-block">{b.alergenos.texto_contiene}</span>
                  )}
                  {b.alergenos.texto_puede_contener && (
                    <span className="d-block">{b.alergenos.texto_puede_contener}</span>
                  )}
                </p>
              )}
              {b.alergenos.estado === 'sugerida' && (
                <Nota>Declaración de alérgenos sugerida por el sistema, sin confirmar</Nota>
              )}
              <p className="mb-1">
                <span className="vp-etiqueta">Elaborado por: </span>
                <Dato valor={b.razon_social} />
                {', '}
                <Dato valor={b.domicilio} />.
              </p>
              {b.es_importado && (
                <p className="mb-1">
                  <span className="vp-etiqueta">Importado por: </span>
                  <Dato valor={b.importador_razon_social} />
                  {', '}
                  <Dato valor={b.importador_domicilio} />.
                </p>
              )}
              <p className="mb-1">
                <Dato etiqueta="País de origen" valor={b.pais_origen} />
              </p>
              <p className="mb-1">
                <Dato etiqueta="Registro del producto" valor={registro} />
                {b.numero_establecimiento && <span> · RNE/RPE N° {b.numero_establecimiento}</span>}
              </p>
              <p className="mb-1">
                <Dato etiqueta="Lote" valor={b.identificacion_lote} />
              </p>
              <p className="mb-1">
                <span className="vp-etiqueta">{fecha.leyenda}: </span>
                {fecha.fecha ? (
                  formatearFecha(fecha.fecha)
                ) : b.vida_util_cantidad ? (
                  <span>
                    dd/mm/aaaa
                    <span className="vp-anotacion">
                      {' '}
                      (elaboración + {b.vida_util_cantidad}{' '}
                      {b.vida_util_unidad === 'meses' ? 'meses' : 'días'})
                    </span>
                  </span>
                ) : (
                  <span className="vp-falta">[falta la vida útil]</span>
                )}
              </p>
              {fecha.lote_fecha_produccion && (
                <p className="mb-1">
                  <span className="vp-etiqueta">Fecha de elaboración: </span>
                  {formatearFecha(fecha.lote_fecha_produccion)}
                </p>
              )}
              <p className="mb-1">
                <Dato
                  valor={b.leyenda_conservacion}
                  etiqueta={b.leyenda_conservacion ? undefined : 'Conservación'}
                />
              </p>
              {b.requiere_instrucciones && (
                <p className="mb-1">
                  <Dato etiqueta="Modo de uso" valor={b.instrucciones} />
                </p>
              )}
              {fecha.lote_codigo_barras && (
                <div className="vp-codigo-barras">
                  <CodigoBarras codigo={fecha.lote_codigo_barras} modulo={2} alto={56} />
                </div>
              )}
            </div>
            <div className="vp-tabla">
              {vista.informacion_nutricional ? (
                <TablaNutricional info={vista.informacion_nutricional} />
              ) : (
                <Nota>Sin tabla nutricional: el producto no tiene receta vigente</Nota>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

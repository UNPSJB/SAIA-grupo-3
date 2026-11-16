import './TablaNutricional.css';
import { formatearValor } from './formato';
import { SUBNUTRIENTES, type ExpresionValor, type InformacionNutricional } from './types';

function valor(expresion: ExpresionValor | null, unidad: string) {
  if (!expresion) return '—';
  return expresion.no_significativo ? expresion.texto : `${expresion.texto} ${unidad}`;
}

function textoPorcion(info: InformacionNutricional) {
  if (info.porcion_cantidad === null || info.porcion_unidad === null)
    return 'Porción: no declarada';
  const cantidad = formatearValor(info.porcion_cantidad, info.porcion_unidad);
  return info.porcion_medida_casera
    ? `Porción ${cantidad} (${info.porcion_medida_casera})`
    : `Porción ${cantidad}`;
}

export function TablaNutricional({ info }: { info: InformacionNutricional }) {
  const base = info.base ?? 'g';
  const filas = info.filas.filter((fila) => fila.obligatorio);
  const conPorcion = info.porcion_base !== null;

  return (
    <div className="tabla-nutricional">
      {!info.completa && (
        <div className="tn-incompleta" role="alert">
          ⚠ {info.leyenda_incompleta}
        </div>
      )}
      <div className="tabla-nutricional-marco">
        <table>
          <thead>
            <tr>
              <th colSpan={4} className="tn-titulo">
                INFORMACIÓN NUTRICIONAL
              </th>
            </tr>
            <tr>
              <th colSpan={4} className="tn-porcion fw-normal">
                {textoPorcion(info)}
              </th>
            </tr>
            <tr>
              <th className="tn-nombre" aria-label="Nutriente" />
              <th>Cantidad por 100 {base}</th>
              <th>Cantidad por porción</th>
              <th>% VD (*)</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const esEnergia = fila.nutriente === 'energia';
              return (
                <tr key={fila.nutriente}>
                  <td
                    className={`tn-nombre${SUBNUTRIENTES.includes(fila.nutriente) ? ' tn-sub' : ''}`}
                  >
                    {fila.nombre_rotulo}
                  </td>
                  <td className="tn-num">
                    {valor(fila.por_100, fila.unidad)}
                    {esEnergia &&
                      info.energia_kj.por_100 &&
                      !info.energia_kj.por_100.no_significativo && (
                        <span className="tn-kj"> = {info.energia_kj.por_100.texto} kJ</span>
                      )}
                  </td>
                  <td className="tn-num">
                    {conPorcion ? valor(fila.por_porcion, fila.unidad) : '—'}
                    {esEnergia &&
                      conPorcion &&
                      info.energia_kj.por_porcion &&
                      !info.energia_kj.por_porcion.no_significativo && (
                        <span className="tn-kj"> = {info.energia_kj.por_porcion.texto} kJ</span>
                      )}
                  </td>
                  <td className="tn-num">
                    {fila.porcentaje_vd ? fila.porcentaje_vd.texto : fila.valor_diario ? '—' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>(*) {info.leyenda_vd}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="tn-leyenda-revision">{info.leyenda_revision}</p>
    </div>
  );
}

import { useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Form, InputGroup, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { BuscadorReferencia } from './BuscadorReferencia';
import { CargaManual } from './CargaManual';
import { HistorialNutricional } from './HistorialNutricional';
import { InsigniaFuente } from './InsigniaFuente';
import {
  cargarManual,
  copiarDesdeReferencia,
  getDatosNutricionales,
  modificarValor,
} from './nutricionApi';
import { formatearValor, numeroDesdeTexto } from './formato';
import type { DatosNutricionales, Nutriente, ValorNutricional } from './types';

interface Edicion {
  nutriente: Nutriente;
  texto: string;
}

export function NutricionInsumo({ insumoId }: { insumoId: number }) {
  const [revision, setRevision] = useState(0);
  const consulta = useConsulta(() => getDatosNutricionales(insumoId), [insumoId]);
  const [datos, setDatos] = useState<DatosNutricionales | null>(null);
  const [modal, setModal] = useState<'referencia' | 'manual' | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const actual = datos ?? consulta.datos;

  const aplicar = (nuevos: DatosNutricionales, mensaje: string) => {
    setDatos(nuevos);
    setAviso(mensaje);
    setError(null);
    setRevision((valor) => valor + 1);
  };

  if (consulta.error && !actual) return <ErrorAlert mensaje={consulta.error} />;
  if (!actual) return <LoadingSpinner mensaje="Cargando información nutricional..." />;

  const { insumo, nutrientes, valores } = actual;
  const esAditivo = insumo.tipo === 'aditivo';
  const valorDe = (nutriente: Nutriente) => valores.find((v) => v.nutriente === nutriente);

  const guardarEdicion = async () => {
    if (!edicion) return;
    const numero = numeroDesdeTexto(edicion.texto);
    if (numero === null || Number.isNaN(numero) || numero < 0) {
      setError('Ingresá un número mayor o igual a cero.');
      return;
    }
    try {
      const nuevos = await modificarValor(insumoId, edicion.nutriente, numero);
      setEdicion(null);
      aplicar(nuevos, 'Valor modificado.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo modificar el valor.');
    }
  };

  const botonModificar = (
    n: { nutriente: Nutriente; etiqueta: string },
    valor: ValorNutricional,
    clase = '',
  ) => (
    <Button
      size="sm"
      variant="link"
      className={clase}
      aria-label={`Modificar ${n.etiqueta}`}
      onClick={() => {
        setError(null);
        setEdicion({ nutriente: n.nutriente, texto: String(valor.valor) });
      }}
    >
      Modificar
    </Button>
  );

  const celdaValor = (n: { nutriente: Nutriente; unidad: string }, valor?: ValorNutricional) => {
    if (edicion?.nutriente === n.nutriente) {
      return (
        <Form
          onSubmit={(evento) => {
            evento.preventDefault();
            void guardarEdicion();
          }}
        >
          <InputGroup size="sm" style={{ minWidth: '11rem' }}>
            <Form.Control
              autoFocus
              aria-label="Nuevo valor"
              inputMode="decimal"
              value={edicion.texto}
              onChange={(evento) => setEdicion({ ...edicion, texto: evento.target.value })}
            />
            <InputGroup.Text>{n.unidad}</InputGroup.Text>
            <Button type="submit" variant="primary">
              OK
            </Button>
            <Button variant="outline-secondary" onClick={() => setEdicion(null)}>
              ✕
            </Button>
          </InputGroup>
        </Form>
      );
    }
    if (!valor) return <span className="text-warning-emphasis small">Sin dato</span>;
    return (
      <>
        <span className="fw-semibold">{formatearValor(valor.valor, n.unidad)}</span>
        {n.nutriente === 'energia' && actual.energia_kj !== null && (
          <span className="text-body-secondary small">
            {' '}
            · {formatearValor(actual.energia_kj, 'kJ')}
          </span>
        )}
      </>
    );
  };

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '960px' }}>
      <Card.Header className="bg-body-tertiary py-3 d-flex flex-wrap gap-2 align-items-center justify-content-between">
        <h5 className="mb-0 text-secondary">Información nutricional por 100 g</h5>
        {nutrientes.length > 0 && (
          <ButtonGroup size="sm">
            <Button variant="outline-primary" onClick={() => setModal('referencia')}>
              Copiar desde base de referencia
            </Button>
            <Button variant="outline-primary" onClick={() => setModal('manual')}>
              Cargar manualmente
            </Button>
          </ButtonGroup>
        )}
      </Card.Header>
      <Card.Body className="p-3 p-md-4">
        {esAditivo && nutrientes.length === 0 && (
          <Alert variant="secondary" className="mb-0">
            Este aditivo no tiene marcado que aporte energía o sodio, así que no necesita datos
            nutricionales. Si los aporta, marcá «Aporta energía o sodio» en la pestaña Datos y
            guardá.
          </Alert>
        )}
        {esAditivo && nutrientes.length > 0 && (
          <Alert variant="info" className="py-2">
            Es un aditivo que aporta energía o sodio: solo se cargan esos dos valores.
          </Alert>
        )}
        {actual.requiere_datos && actual.faltantes.length > 0 && (
          <Alert variant="warning" className="py-2">
            Faltan {actual.faltantes.length} de {nutrientes.length} nutrientes. Si el insumo forma
            parte de una receta, hacen falta para calcular la tabla nutricional del producto.
          </Alert>
        )}
        {aviso && !error && (
          <Alert variant="success" className="py-2" dismissible onClose={() => setAviso(null)}>
            {aviso}
          </Alert>
        )}
        {error && <ErrorAlert mensaje={error} />}
        {nutrientes.length > 0 && (
          <Table responsive hover className="align-middle mb-0">
            <thead>
              <tr className="small text-body-secondary">
                <th>Nutriente</th>
                <th>Valor</th>
                <th className="d-none d-md-table-cell">Fuente</th>
                <th className="d-none d-md-table-cell">Carga</th>
                <th aria-label="Acciones" className="d-none d-md-table-cell" />
              </tr>
            </thead>
            <tbody>
              {nutrientes.map((n) => {
                const valor = valorDe(n.nutriente);
                return (
                  <tr key={n.nutriente}>
                    <td
                      className={
                        [
                          'azucares_totales',
                          'azucares_anadidos',
                          'grasas_saturadas',
                          'grasas_trans',
                        ].includes(n.nutriente)
                          ? 'ps-4'
                          : ''
                      }
                    >
                      {n.etiqueta}
                    </td>
                    <td>
                      <div className="text-nowrap">{celdaValor(n, valor)}</div>
                      {valor && edicion?.nutriente !== n.nutriente && (
                        <div className="d-md-none mt-1 d-flex flex-wrap gap-1">
                          <InsigniaFuente fuente={valor.fuente} />
                          {valor.modificado && (
                            <Badge bg="warning" text="dark" className="text-wrap text-start">
                              Modificado · original {formatearValor(valor.valor_fuente, n.unidad)}
                            </Badge>
                          )}
                          {botonModificar(n, valor, 'p-0 ms-1 small')}
                        </div>
                      )}
                    </td>
                    <td className="d-none d-md-table-cell">
                      {valor && (
                        <div className="d-flex flex-wrap gap-1 align-items-center">
                          <InsigniaFuente fuente={valor.fuente} />
                          {valor.modificado && (
                            <Badge
                              bg="warning"
                              text="dark"
                              title={`Original: ${formatearValor(valor.valor_fuente, n.unidad)}`}
                            >
                              Modificado
                            </Badge>
                          )}
                        </div>
                      )}
                      {valor?.detalle_fuente && (
                        <div className="small text-body-secondary">{valor.detalle_fuente}</div>
                      )}
                    </td>
                    <td className="small text-body-secondary d-none d-md-table-cell">
                      {valor && (
                        <>
                          <div className="text-nowrap">{formatearFechaHora(valor.cargado_en)}</div>
                          <div>
                            {valor.cargado_por.nombre} {valor.cargado_por.apellido}
                          </div>
                          {valor.modificado && valor.modificado_por && (
                            <div className="text-warning-emphasis">
                              Modificó {valor.modificado_por.nombre} {valor.modificado_por.apellido}
                              {valor.modificado_en
                                ? `, ${formatearFechaHora(valor.modificado_en)}`
                                : ''}
                              {` · original ${formatearValor(valor.valor_fuente, n.unidad)}`}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="text-end d-none d-md-table-cell">
                      {valor && edicion?.nutriente !== n.nutriente && botonModificar(n, valor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="mt-4 border-top pt-3">
          <Button
            variant="link"
            className="p-0 text-decoration-none"
            aria-expanded={verHistorial}
            onClick={() => setVerHistorial((valor) => !valor)}
          >
            {verHistorial ? '▾ Ocultar historial de cambios' : '▸ Ver historial de cambios'}
          </Button>
          {verHistorial && (
            <div className="mt-2">
              <HistorialNutricional insumoId={insumoId} revision={revision} />
            </div>
          )}
        </div>
      </Card.Body>
      <BuscadorReferencia
        show={modal === 'referencia'}
        nutrientes={nutrientes}
        tieneValores={valores.length > 0}
        onCerrar={() => setModal(null)}
        onCopiar={async (alimento) => {
          aplicar(
            await copiarDesdeReferencia(insumoId, alimento.id),
            `Valores copiados de «${alimento.nombre}».`,
          );
        }}
      />
      <CargaManual
        show={modal === 'manual'}
        nutrientes={nutrientes}
        actuales={valores}
        onCerrar={() => setModal(null)}
        onGuardar={async (fuente, detalle, nuevos) => {
          aplicar(await cargarManual(insumoId, fuente, detalle, nuevos), 'Valores guardados.');
        }}
      />
    </Card>
  );
}

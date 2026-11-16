import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { numeroDesdeTexto } from './formato';
import { getConfiguracionNutricional, guardarConfiguracionNutricional } from './nutricionApi';
import type { ConfiguracionNutricional, Nutriente } from './types';

interface FilaEditable {
  nutriente: Nutriente;
  etiqueta: string;
  unidad_dato: string;
  valor_diario: string;
  unidad: string;
  decimales: string;
  entero_desde: string;
  umbral_no_significativo: string;
  nombre_rotulo: string;
  obligatorio: boolean;
}

interface Borrador {
  expresion_no_significativo: string;
  decimales_vd: string;
  leyenda_vd: string;
  leyenda_revision: string;
  filas: FilaEditable[];
}

const texto = (valor: number | null) => (valor === null ? '' : String(valor).replace('.', ','));

function aBorrador(config: ConfiguracionNutricional): Borrador {
  return {
    expresion_no_significativo: config.expresion_no_significativo,
    decimales_vd: String(config.decimales_vd),
    leyenda_vd: config.leyenda_vd,
    leyenda_revision: config.leyenda_revision,
    filas: config.nutrientes.map((fila) => ({
      nutriente: fila.nutriente,
      etiqueta: fila.etiqueta,
      unidad_dato: fila.unidad_dato,
      valor_diario: texto(fila.valor_diario),
      unidad: fila.unidad,
      decimales: String(fila.decimales),
      entero_desde: texto(fila.entero_desde),
      umbral_no_significativo: texto(fila.umbral_no_significativo),
      nombre_rotulo: fila.nombre_rotulo,
      obligatorio: fila.obligatorio,
    })),
  };
}

function numeroOpcional(valor: string, campo: string, etiqueta: string): number | null {
  const numero = numeroDesdeTexto(valor);
  if (numero === null) return null;
  if (Number.isNaN(numero) || numero < 0)
    throw new Error(`${etiqueta}: ${campo} debe ser un número positivo.`);
  return numero;
}

function entero(valor: string, campo: string, maximo: number): number {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0 || numero > maximo)
    throw new Error(`${campo} debe ser un número entero entre 0 y ${maximo}.`);
  return numero;
}

export function ValoresDiariosPage() {
  const [revision, setRevision] = useState(0);
  const consulta = useConsulta(getConfiguracionNutricional, [revision]);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  if (consulta.error) return <ErrorAlert mensaje={consulta.error} />;
  if (!consulta.datos) return <LoadingSpinner mensaje="Cargando configuración..." />;

  const actual = borrador ?? aBorrador(consulta.datos);
  const cambiar = (cambios: Partial<Borrador>) => {
    setGuardado(false);
    setBorrador({ ...actual, ...cambios });
  };
  const mover = (indice: number, desplazamiento: number) => {
    const filas = [...actual.filas];
    const destino = indice + desplazamiento;
    if (destino < 0 || destino >= filas.length) return;
    [filas[indice], filas[destino]] = [filas[destino], filas[indice]];
    cambiar({ filas });
  };
  const cambiarFila = (nutriente: Nutriente, campo: keyof FilaEditable, valor: string | boolean) =>
    cambiar({
      filas: actual.filas.map((fila) =>
        fila.nutriente === nutriente ? { ...fila, [campo]: valor } : fila,
      ),
    });

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setError(null);
    let datos;
    try {
      datos = {
        expresion_no_significativo: actual.expresion_no_significativo.trim(),
        decimales_vd: entero(actual.decimales_vd, 'Los decimales del % VD', 2),
        leyenda_vd: actual.leyenda_vd.trim(),
        leyenda_revision: actual.leyenda_revision.trim(),
        nutrientes: actual.filas.map((fila, indice) => {
          const valorDiario = numeroOpcional(fila.valor_diario, 'el valor diario', fila.etiqueta);
          if (valorDiario === 0)
            throw new Error(
              `${fila.etiqueta}: el valor diario debe ser mayor a cero o quedar vacío.`,
            );
          if (!fila.unidad.trim()) throw new Error(`${fila.etiqueta}: indicá la unidad.`);
          if (!fila.nombre_rotulo.trim())
            throw new Error(`${fila.etiqueta}: indicá el nombre con que se muestra en el rótulo.`);
          return {
            nutriente: fila.nutriente,
            valor_diario: valorDiario,
            unidad: fila.unidad.trim(),
            decimales: entero(fila.decimales, `${fila.etiqueta}: los decimales`, 3),
            entero_desde: numeroOpcional(fila.entero_desde, '"entero desde"', fila.etiqueta),
            nombre_rotulo: fila.nombre_rotulo.trim(),
            orden: indice + 1,
            obligatorio: fila.obligatorio,
            umbral_no_significativo: numeroOpcional(
              fila.umbral_no_significativo,
              'el umbral',
              fila.etiqueta,
            ),
          };
        }),
      };
      if (!datos.expresion_no_significativo)
        throw new Error('Indicá cómo se expresa un valor no significativo.');
      if (!datos.leyenda_vd) throw new Error('Indicá la leyenda del % VD.');
      if (!datos.leyenda_revision)
        throw new Error('Indicá la leyenda de revisión profesional: no puede quedar vacía.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Revisá los datos.');
      return;
    }
    setGuardando(true);
    try {
      await guardarConfiguracionNutricional(datos);
      setBorrador(null);
      setRevision((valor) => valor + 1);
      setGuardado(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Container className="py-2">
      <h2 className="mb-2 border-bottom pb-2 text-secondary">Valores diarios y redondeo</h2>
      <p className="text-body-secondary small mb-4">
        Definen cómo se expresa la información nutricional de las recetas. Al guardar, las tablas se
        muestran con las reglas nuevas sin recalcular los valores. Los valores iniciales siguen el
        Reglamento Técnico MERCOSUR de rotulado nutricional (Res. GMC 46/03).
      </p>
      <Form noValidate onSubmit={guardar}>
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
            Expresión general
          </Card.Header>
          <Card.Body className="p-3 p-md-4">
            <Row className="g-3">
              <Col md={4}>
                <Form.Group controlId="vd-no-significativo">
                  <Form.Label>Valor no significativo se expresa como</Form.Label>
                  <Form.Control
                    maxLength={40}
                    value={actual.expresion_no_significativo}
                    onChange={(evento) =>
                      cambiar({ expresion_no_significativo: evento.target.value })
                    }
                  />
                  <Form.Text>Por ejemplo «0», «cero» o «no contiene».</Form.Text>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="vd-decimales">
                  <Form.Label>Decimales del % VD</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={2}
                    value={actual.decimales_vd}
                    onChange={(evento) => cambiar({ decimales_vd: evento.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="vd-leyenda">
                  <Form.Label>Leyenda del % VD</Form.Label>
                  <Form.Control
                    maxLength={250}
                    value={actual.leyenda_vd}
                    onChange={(evento) => cambiar({ leyenda_vd: evento.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="vd-leyenda-revision">
                  <Form.Label>Leyenda de revisión profesional</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    maxLength={500}
                    value={actual.leyenda_revision}
                    onChange={(evento) => cambiar({ leyenda_revision: evento.target.value })}
                  />
                  <Form.Text>
                    Se muestra siempre debajo de la tabla en formato de rótulo y en su impresión.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm border-0 mb-3">
          <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
            Por nutriente
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive className="mb-0 align-middle small">
              <thead>
                <tr className="text-body-secondary">
                  <th className="ps-3">Orden</th>
                  <th style={{ minWidth: '9rem' }}>Nombre en el rótulo</th>
                  <th className="text-center">En la tabla</th>
                  <th style={{ minWidth: '8rem' }}>Valor diario</th>
                  <th style={{ minWidth: '6rem' }}>Unidad a mostrar</th>
                  <th style={{ minWidth: '5rem' }}>Decimales</th>
                  <th style={{ minWidth: '7rem' }}>Sin decimales desde</th>
                  <th style={{ minWidth: '7rem' }}>No significativo hasta</th>
                </tr>
              </thead>
              <tbody>
                {actual.filas.map((fila, indice) => (
                  <tr key={fila.nutriente}>
                    <td className="ps-3 text-nowrap">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="py-0 px-1 me-1"
                        aria-label={`Subir ${fila.etiqueta}`}
                        disabled={indice === 0}
                        onClick={() => mover(indice, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="py-0 px-1"
                        aria-label={`Bajar ${fila.etiqueta}`}
                        disabled={indice === actual.filas.length - 1}
                        onClick={() => mover(indice, 1)}
                      >
                        ↓
                      </Button>
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        aria-label={`Nombre en el rótulo de ${fila.etiqueta}`}
                        maxLength={60}
                        value={fila.nombre_rotulo}
                        onChange={(evento) =>
                          cambiarFila(fila.nutriente, 'nombre_rotulo', evento.target.value)
                        }
                      />
                    </td>
                    <td className="text-center">
                      <Form.Check
                        aria-label={`${fila.etiqueta} se declara en la tabla`}
                        checked={fila.obligatorio}
                        onChange={(evento) =>
                          cambiarFila(fila.nutriente, 'obligatorio', evento.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <div className="input-group input-group-sm">
                        <Form.Control
                          aria-label={`Valor diario de ${fila.etiqueta}`}
                          inputMode="decimal"
                          placeholder="No aplica"
                          value={fila.valor_diario}
                          onChange={(evento) =>
                            cambiarFila(fila.nutriente, 'valor_diario', evento.target.value)
                          }
                        />
                        <span className="input-group-text">{fila.unidad_dato}</span>
                      </div>
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        aria-label={`Unidad de ${fila.etiqueta}`}
                        maxLength={10}
                        value={fila.unidad}
                        onChange={(evento) =>
                          cambiarFila(fila.nutriente, 'unidad', evento.target.value)
                        }
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="number"
                        min={0}
                        max={3}
                        aria-label={`Decimales de ${fila.etiqueta}`}
                        value={fila.decimales}
                        onChange={(evento) =>
                          cambiarFila(fila.nutriente, 'decimales', evento.target.value)
                        }
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        inputMode="decimal"
                        placeholder="—"
                        aria-label={`Sin decimales desde, ${fila.etiqueta}`}
                        value={fila.entero_desde}
                        onChange={(evento) =>
                          cambiarFila(fila.nutriente, 'entero_desde', evento.target.value)
                        }
                      />
                    </td>
                    <td>
                      <div className="input-group input-group-sm">
                        <Form.Control
                          inputMode="decimal"
                          placeholder="Sin umbral"
                          aria-label={`Umbral no significativo de ${fila.etiqueta}`}
                          value={fila.umbral_no_significativo}
                          onChange={(evento) =>
                            cambiarFila(
                              fila.nutriente,
                              'umbral_no_significativo',
                              evento.target.value,
                            )
                          }
                        />
                        <span className="input-group-text">{fila.unidad_dato}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
        <ul className="small text-body-secondary mb-4">
          <li>
            <strong>Decimales</strong>: cifras decimales con que se muestra el valor. Con «Sin
            decimales desde» vacío, el valor siempre usa esos decimales.
          </li>
          <li>
            <strong>Sin decimales desde</strong>: a partir de ese valor se muestra entero (por
            ejemplo, 10 g o más se declara sin decimales).
          </li>
          <li>
            <strong>No significativo hasta</strong>: un valor menor o igual se expresa con el texto
            de valor no significativo y su % VD es 0. Vacío: nunca.
          </li>
          <li>Un valor diario vacío significa que ese nutriente no lleva % VD.</li>
          <li>
            <strong>Orden</strong>, <strong>Nombre en el rótulo</strong> y{' '}
            <strong>En la tabla</strong> definen la tabla en formato de rótulo: qué nutrientes se
            declaran, en qué orden y con qué nombre.
          </li>
        </ul>
        {error && <ErrorAlert mensaje={error} />}
        {guardado && (
          <Alert variant="success" className="py-2" dismissible onClose={() => setGuardado(false)}>
            Configuración guardada.
          </Alert>
        )}
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <span className="small text-body-secondary">
            {consulta.datos.modificado_en && consulta.datos.modificado_por
              ? `Última modificación: ${consulta.datos.modificado_por.nombre} ${consulta.datos.modificado_por.apellido}, ${formatearFechaHora(consulta.datos.modificado_en)}`
              : 'Sin modificaciones: valores iniciales.'}
          </span>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => {
                setBorrador(null);
                setError(null);
                setGuardado(false);
                setRevision((valor) => valor + 1);
              }}
            >
              Descartar cambios
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Form>
    </Container>
  );
}

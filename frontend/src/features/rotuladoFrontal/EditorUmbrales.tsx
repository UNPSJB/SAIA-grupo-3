import { Badge, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import {
  AGREGADOS,
  APLICA_A,
  COMPARACIONES,
  FORMULAS,
  HECHOS,
  NUTRIENTES,
  SELLOS,
  UMBRAL_NUEVO,
} from './etiquetas';
import type {
  AplicaA,
  Comparacion,
  Formula,
  Hecho,
  NutrienteEvaluable,
  Sello,
  UmbralDatos,
} from './types';

const numero = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));
const formato = (valor: number) => valor.toLocaleString('es-AR', { maximumFractionDigits: 3 });

function condiciones(umbral: UmbralDatos) {
  const partes: string[] = [];
  if (umbral.requiere_agregado)
    partes.push(`Solo si ${HECHOS[umbral.requiere_agregado].toLowerCase()}`);
  if (umbral.requiere_alguno_de.length)
    partes.push(
      `Solo junto con sello de ${umbral.requiere_alguno_de.map((s) => SELLOS[s].toLowerCase()).join(', ')}`,
    );
  if (umbral.energia_maxima_porcion !== null)
    partes.push(`Solo con ${formato(umbral.energia_maxima_porcion)} kcal o menos por porción`);
  return partes;
}

function VistaUmbrales({ umbrales }: { umbrales: UmbralDatos[] }) {
  return (
    <>
      <div className="d-md-none">
        {umbrales.map((umbral, indice) => (
          <div key={indice} className="border-bottom p-3 small">
            <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
              <Badge bg="dark" className="fw-semibold">
                {umbral.leyenda}
              </Badge>
              <span className="fw-semibold">
                {COMPARACIONES[umbral.comparacion]} {formato(umbral.limite)} {umbral.unidad}
              </span>
            </div>
            <div>
              {NUTRIENTES[umbral.nutriente]} · {FORMULAS[umbral.formula]}
              {umbral.factor_energetico !== null &&
                ` · factor ${formato(umbral.factor_energetico)} kcal/g`}
            </div>
            <div className="text-body-secondary">{APLICA_A[umbral.aplica_a]}</div>
            {condiciones(umbral).map((texto) => (
              <div key={texto} className="text-body-secondary">
                {texto}
              </div>
            ))}
            {umbral.nota && <div className="text-body-secondary fst-italic">{umbral.nota}</div>}
          </div>
        ))}
      </div>
      <Table responsive hover className="mb-0 align-middle small d-none d-md-table">
        <thead>
          <tr className="text-body-secondary">
            <th>Sello</th>
            <th>Cálculo</th>
            <th className="text-nowrap">Umbral</th>
            <th>Aplica a</th>
            <th>Condiciones</th>
          </tr>
        </thead>
        <tbody>
          {umbrales.map((umbral, indice) => (
            <tr key={indice}>
              <td>
                <Badge bg="dark" className="fw-semibold">
                  {umbral.leyenda}
                </Badge>
              </td>
              <td>
                {NUTRIENTES[umbral.nutriente]}
                <div className="text-body-secondary">
                  {FORMULAS[umbral.formula]}
                  {umbral.factor_energetico !== null &&
                    ` · factor ${formato(umbral.factor_energetico)} kcal/g`}
                </div>
              </td>
              <td className="text-nowrap fw-semibold">
                {COMPARACIONES[umbral.comparacion]} {formato(umbral.limite)} {umbral.unidad}
              </td>
              <td>{APLICA_A[umbral.aplica_a]}</td>
              <td>
                {condiciones(umbral).map((texto) => (
                  <div key={texto}>{texto}</div>
                ))}
                {umbral.nota && <div className="text-body-secondary fst-italic">{umbral.nota}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

interface Props {
  umbrales: UmbralDatos[];
  editable: boolean;
  onChange: (umbrales: UmbralDatos[]) => void;
}

export function EditorUmbrales({ umbrales, editable, onChange }: Props) {
  if (!editable) return <VistaUmbrales umbrales={umbrales} />;

  const cambiar = (indice: number, cambios: Partial<UmbralDatos>) =>
    onChange(umbrales.map((umbral, i) => (i === indice ? { ...umbral, ...cambios } : umbral)));
  const quitar = (indice: number) => onChange(umbrales.filter((_, i) => i !== indice));

  return (
    <div className="p-3 d-grid gap-3">
      {umbrales.map((umbral, indice) => {
        const id = `umbral-${indice}`;
        return (
          <Card key={indice} className="border">
            <Card.Body className="p-3">
              <Row className="g-2">
                <Col md={3}>
                  <Form.Label htmlFor={`${id}-sello`} className="small mb-1">
                    Sello
                  </Form.Label>
                  <Form.Select
                    id={`${id}-sello`}
                    size="sm"
                    value={umbral.sello}
                    onChange={(e) => cambiar(indice, { sello: e.target.value as Sello })}
                  >
                    {Object.entries(SELLOS).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label htmlFor={`${id}-leyenda`} className="small mb-1">
                    Leyenda del sello
                  </Form.Label>
                  <Form.Control
                    id={`${id}-leyenda`}
                    size="sm"
                    maxLength={60}
                    value={umbral.leyenda}
                    onChange={(e) => cambiar(indice, { leyenda: e.target.value })}
                  />
                </Col>
                <Col md={5}>
                  <Form.Label htmlFor={`${id}-nutriente`} className="small mb-1">
                    Nutriente
                  </Form.Label>
                  <Form.Select
                    id={`${id}-nutriente`}
                    size="sm"
                    value={umbral.nutriente}
                    onChange={(e) =>
                      cambiar(indice, { nutriente: e.target.value as NutrienteEvaluable })
                    }
                  >
                    {Object.entries(NUTRIENTES).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={5}>
                  <Form.Label htmlFor={`${id}-formula`} className="small mb-1">
                    Fórmula
                  </Form.Label>
                  <Form.Select
                    id={`${id}-formula`}
                    size="sm"
                    value={umbral.formula}
                    onChange={(e) => {
                      const formula = e.target.value as Formula;
                      cambiar(indice, {
                        formula,
                        factor_energetico:
                          formula === 'porcentaje_energia' ? (umbral.factor_energetico ?? 4) : null,
                      });
                    }}
                  >
                    {Object.entries(FORMULAS).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                {umbral.formula === 'porcentaje_energia' && (
                  <Col md={2}>
                    <Form.Label htmlFor={`${id}-factor`} className="small mb-1">
                      Factor (kcal/g)
                    </Form.Label>
                    <Form.Control
                      id={`${id}-factor`}
                      size="sm"
                      type="number"
                      step="any"
                      min={0}
                      value={umbral.factor_energetico ?? ''}
                      onChange={(e) =>
                        cambiar(indice, { factor_energetico: numero(e.target.value) })
                      }
                    />
                  </Col>
                )}
                <Col md={2}>
                  <Form.Label htmlFor={`${id}-comparacion`} className="small mb-1">
                    Comparación
                  </Form.Label>
                  <Form.Select
                    id={`${id}-comparacion`}
                    size="sm"
                    value={umbral.comparacion}
                    onChange={(e) =>
                      cambiar(indice, { comparacion: e.target.value as Comparacion })
                    }
                  >
                    <option value="mayor_o_igual">≥ (igual o mayor)</option>
                    <option value="mayor">&gt; (mayor)</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor={`${id}-limite`} className="small mb-1">
                    Límite
                  </Form.Label>
                  <Form.Control
                    id={`${id}-limite`}
                    size="sm"
                    type="number"
                    step="any"
                    min={0}
                    value={Number.isNaN(umbral.limite) ? '' : umbral.limite}
                    onChange={(e) =>
                      cambiar(indice, { limite: numero(e.target.value) ?? Number.NaN })
                    }
                  />
                </Col>
                <Col md={4}>
                  <Form.Label htmlFor={`${id}-unidad`} className="small mb-1">
                    Unidad
                  </Form.Label>
                  <Form.Control
                    id={`${id}-unidad`}
                    size="sm"
                    maxLength={30}
                    value={umbral.unidad}
                    onChange={(e) => cambiar(indice, { unidad: e.target.value })}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor={`${id}-aplica`} className="small mb-1">
                    Aplica a
                  </Form.Label>
                  <Form.Select
                    id={`${id}-aplica`}
                    size="sm"
                    value={umbral.aplica_a}
                    onChange={(e) => cambiar(indice, { aplica_a: e.target.value as AplicaA })}
                  >
                    {Object.entries(APLICA_A).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor={`${id}-agregado`} className="small mb-1">
                    Se evalúa solo si
                  </Form.Label>
                  <Form.Select
                    id={`${id}-agregado`}
                    size="sm"
                    value={umbral.requiere_agregado ?? ''}
                    onChange={(e) =>
                      cambiar(indice, {
                        requiere_agregado: (e.target.value || null) as Hecho | null,
                      })
                    }
                  >
                    <option value="">Siempre</option>
                    {AGREGADOS.map((hecho) => (
                      <option key={hecho} value={hecho}>
                        {HECHOS[hecho].toLowerCase()}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Label htmlFor={`${id}-porcion`} className="small mb-1">
                    Máx. kcal/porción
                  </Form.Label>
                  <Form.Control
                    id={`${id}-porcion`}
                    size="sm"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="—"
                    value={umbral.energia_maxima_porcion ?? ''}
                    onChange={(e) =>
                      cambiar(indice, { energia_maxima_porcion: numero(e.target.value) })
                    }
                  />
                </Col>
                <Col md={7}>
                  <div className="small mb-1">Solo junto con otro sello de</div>
                  <div className="d-flex flex-wrap gap-3">
                    {(Object.keys(SELLOS) as Sello[])
                      .filter((sello) => sello !== umbral.sello)
                      .map((sello) => (
                        <Form.Check
                          key={sello}
                          id={`${id}-requiere-${sello}`}
                          className="small"
                          label={SELLOS[sello]}
                          checked={umbral.requiere_alguno_de.includes(sello)}
                          onChange={(e) =>
                            cambiar(indice, {
                              requiere_alguno_de: e.target.checked
                                ? [...umbral.requiere_alguno_de, sello]
                                : umbral.requiere_alguno_de.filter((s) => s !== sello),
                            })
                          }
                        />
                      ))}
                  </div>
                </Col>
                <Col md={5}>
                  <Form.Label htmlFor={`${id}-nota`} className="small mb-1">
                    Nota
                  </Form.Label>
                  <Form.Control
                    id={`${id}-nota`}
                    size="sm"
                    maxLength={300}
                    value={umbral.nota ?? ''}
                    onChange={(e) => cambiar(indice, { nota: e.target.value || null })}
                  />
                </Col>
              </Row>
              <div className="text-end mt-2">
                <Button size="sm" variant="outline-danger" onClick={() => quitar(indice)}>
                  Quitar umbral
                </Button>
              </div>
            </Card.Body>
          </Card>
        );
      })}
      <div>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => onChange([...umbrales, { ...UMBRAL_NUEVO }])}
        >
          Agregar umbral
        </Button>
      </div>
    </div>
  );
}

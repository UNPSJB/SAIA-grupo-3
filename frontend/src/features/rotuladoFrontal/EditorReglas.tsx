import { Badge, Button, Form, ListGroup, Row, Col } from 'react-bootstrap';
import { HECHOS, OPERADORES, RESULTADOS } from './etiquetas';
import type {
  AdvertenciaDatos,
  Hecho,
  Operador,
  ReglaDatos,
  ResultadoAplicabilidad,
} from './types';

const TODOS_LOS_HECHOS = Object.keys(HECHOS) as Hecho[];

interface Props {
  reglas: ReglaDatos[];
  editable: boolean;
  onChange: (reglas: ReglaDatos[]) => void;
}

export function EditorReglas({ reglas, editable, onChange }: Props) {
  const cambiar = (indice: number, cambios: Partial<ReglaDatos>) =>
    onChange(reglas.map((regla, i) => (i === indice ? { ...regla, ...cambios } : regla)));
  const mover = (indice: number, paso: number) => {
    const copia = [...reglas];
    [copia[indice], copia[indice + paso]] = [copia[indice + paso], copia[indice]];
    onChange(copia);
  };

  return (
    <>
      <ListGroup variant="flush">
        {reglas.map((regla, indice) => (
          <ListGroup.Item key={indice} className="py-3">
            {!editable ? (
              <div className="d-flex flex-wrap gap-2 align-items-start">
                <span className="text-body-secondary small">{indice + 1}.</span>
                <div className="flex-grow-1">
                  <div className="small">
                    {OPERADORES[regla.operador]}
                    {regla.hechos.length > 0 && (
                      <>: {regla.hechos.map((h) => HECHOS[h].toLowerCase()).join(' · ')}</>
                    )}
                  </div>
                  <div className="small text-body-secondary">{regla.mensaje}</div>
                </div>
                <Badge bg={RESULTADOS[regla.resultado].color}>
                  {RESULTADOS[regla.resultado].etiqueta}
                </Badge>
              </div>
            ) : (
              <Row className="g-2 align-items-start">
                <Col md={1} className="text-nowrap">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="py-0 px-1 me-1"
                    aria-label={`Subir regla ${indice + 1}`}
                    disabled={indice === 0}
                    onClick={() => mover(indice, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="py-0 px-1"
                    aria-label={`Bajar regla ${indice + 1}`}
                    disabled={indice === reglas.length - 1}
                    onClick={() => mover(indice, 1)}
                  >
                    ↓
                  </Button>
                </Col>
                <Col md={3}>
                  <Form.Select
                    size="sm"
                    aria-label={`Condición de la regla ${indice + 1}`}
                    value={regla.operador}
                    onChange={(e) => {
                      const operador = e.target.value as Operador;
                      cambiar(indice, {
                        operador,
                        hechos: operador === 'siempre' ? [] : regla.hechos,
                      });
                    }}
                  >
                    {Object.entries(OPERADORES).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Select
                    size="sm"
                    className="mt-2"
                    aria-label={`Resultado de la regla ${indice + 1}`}
                    value={regla.resultado}
                    onChange={(e) =>
                      cambiar(indice, { resultado: e.target.value as ResultadoAplicabilidad })
                    }
                  >
                    {Object.entries(RESULTADOS).map(([valor, { etiqueta }]) => (
                      <option key={valor} value={valor}>
                        → {etiqueta}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  {regla.operador !== 'siempre' &&
                    TODOS_LOS_HECHOS.map((hecho) => (
                      <Form.Check
                        key={hecho}
                        id={`regla-${indice}-${hecho}`}
                        className="small"
                        label={HECHOS[hecho]}
                        checked={regla.hechos.includes(hecho)}
                        onChange={(e) =>
                          cambiar(indice, {
                            hechos: e.target.checked
                              ? [...regla.hechos, hecho]
                              : regla.hechos.filter((h) => h !== hecho),
                          })
                        }
                      />
                    ))}
                </Col>
                <Col md={4}>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    size="sm"
                    maxLength={300}
                    aria-label={`Mensaje de la regla ${indice + 1}`}
                    value={regla.mensaje}
                    onChange={(e) => cambiar(indice, { mensaje: e.target.value })}
                  />
                  <div className="text-end mt-2">
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => onChange(reglas.filter((_, i) => i !== indice))}
                    >
                      Quitar regla
                    </Button>
                  </div>
                </Col>
              </Row>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
      {editable && (
        <div className="p-3 pt-0">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() =>
              onChange([
                ...reglas,
                { operador: 'alguno', hechos: [], resultado: 'corresponde', mensaje: '' },
              ])
            }
          >
            Agregar regla
          </Button>
        </div>
      )}
    </>
  );
}

interface PropsAdvertencias {
  advertencias: AdvertenciaDatos[];
  editable: boolean;
  onChange: (advertencias: AdvertenciaDatos[]) => void;
}

export function EditorAdvertencias({ advertencias, editable, onChange }: PropsAdvertencias) {
  const cambiar = (indice: number, cambios: Partial<AdvertenciaDatos>) =>
    onChange(advertencias.map((a, i) => (i === indice ? { ...a, ...cambios } : a)));
  return (
    <ListGroup variant="flush">
      {advertencias.map((advertencia, indice) => (
        <ListGroup.Item key={indice}>
          {!editable ? (
            <div className="d-flex flex-wrap gap-2 align-items-center small">
              <span>{HECHOS[advertencia.hecho]}:</span>
              <Badge bg="dark" className="fw-semibold text-wrap text-start">
                {advertencia.texto}
              </Badge>
            </div>
          ) : (
            <Row className="g-2">
              <Col md={4}>
                <Form.Select
                  size="sm"
                  aria-label={`Dato de la advertencia ${indice + 1}`}
                  value={advertencia.hecho}
                  onChange={(e) => cambiar(indice, { hecho: e.target.value as Hecho })}
                >
                  {TODOS_LOS_HECHOS.map((hecho) => (
                    <option key={hecho} value={hecho}>
                      {HECHOS[hecho]}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Control
                  size="sm"
                  maxLength={150}
                  aria-label={`Texto de la advertencia ${indice + 1}`}
                  value={advertencia.texto}
                  onChange={(e) => cambiar(indice, { texto: e.target.value })}
                />
              </Col>
              <Col md={2} className="text-end">
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => onChange(advertencias.filter((_, i) => i !== indice))}
                >
                  Quitar
                </Button>
              </Col>
            </Row>
          )}
        </ListGroup.Item>
      ))}
      {editable && (
        <ListGroup.Item>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() =>
              onChange([...advertencias, { hecho: 'contiene_edulcorantes', texto: '' }])
            }
          >
            Agregar advertencia
          </Button>
        </ListGroup.Item>
      )}
    </ListGroup>
  );
}

import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { PASO_VACIO, type ValoresReceta } from './valoresReceta';

interface PasosEditorProps {
  form: UseFormReturn<ValoresReceta>;
  equipos: { id?: number; nombre: string }[];
}

const decimalOpcional = (valor: string) =>
  !valor.trim() || Number.isFinite(Number(valor.replace(',', '.')));

export function PasosEditor({ form, equipos }: PasosEditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'pasos' });
  const { errors } = form.formState;

  return (
    <>
      {fields.length === 0 && (
        <p className="text-body-secondary small mb-2">
          Todavía no hay pasos. Cargá el procedimiento de elaboración en el orden en que se hace.
        </p>
      )}
      <div className="d-flex flex-column gap-3 mb-3">
        {fields.map((campo, indice) => (
          <Card key={campo.id} className="border">
            <Card.Header className="bg-body-tertiary d-flex align-items-center gap-2 py-2">
              <span className="fw-semibold me-auto">Paso {indice + 1}</span>
              <Button
                size="sm"
                variant="outline-secondary"
                title="Subir"
                aria-label={`Subir paso ${indice + 1}`}
                disabled={indice === 0}
                onClick={() => move(indice, indice - 1)}
              >
                <i className="bi bi-arrow-up" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                title="Bajar"
                aria-label={`Bajar paso ${indice + 1}`}
                disabled={indice === fields.length - 1}
                onClick={() => move(indice, indice + 1)}
              >
                <i className="bi bi-arrow-down" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                title="Quitar"
                aria-label={`Quitar paso ${indice + 1}`}
                onClick={() => remove(indice)}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId={`paso-${campo.id}-nombre`}>
                    <Form.Label>Nombre</Form.Label>
                    <Form.Control
                      placeholder="Ej.: Amasar"
                      isInvalid={!!errors.pasos?.[indice]?.nombre}
                      {...form.register(`pasos.${indice}.nombre`, {
                        validate: (valor) => !!valor.trim() || 'Cada paso debe tener un nombre.',
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId={`paso-${campo.id}-equipo`}>
                    <Form.Label>Equipo — opcional</Form.Label>
                    <Form.Select {...form.register(`pasos.${indice}.equipo_id`)}>
                      <option value="">Sin equipo</option>
                      {equipos.map((equipo) => (
                        <option key={equipo.id} value={equipo.id}>
                          {equipo.nombre}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group controlId={`paso-${campo.id}-procedimiento`}>
                    <Form.Label>Procedimiento</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      isInvalid={!!errors.pasos?.[indice]?.procedimiento}
                      {...form.register(`pasos.${indice}.procedimiento`, {
                        validate: (valor) =>
                          !!valor.trim() || 'Cada paso debe tener su procedimiento.',
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col sm={4}>
                  <Form.Group controlId={`paso-${campo.id}-tiempo`}>
                    <Form.Label>Tiempo (min) — opcional</Form.Label>
                    <Form.Control
                      inputMode="numeric"
                      isInvalid={!!errors.pasos?.[indice]?.tiempo_minutos}
                      {...form.register(`pasos.${indice}.tiempo_minutos`, {
                        validate: (valor) =>
                          !valor.trim() ||
                          (Number.isInteger(Number(valor)) && Number(valor) > 0) ||
                          'El tiempo debe ser una cantidad entera de minutos.',
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col sm={4}>
                  <Form.Group controlId={`paso-${campo.id}-temperatura`}>
                    <Form.Label>Temperatura (°C) — opcional</Form.Label>
                    <Form.Control
                      inputMode="decimal"
                      isInvalid={!!errors.pasos?.[indice]?.temperatura_celsius}
                      {...form.register(`pasos.${indice}.temperatura_celsius`, {
                        validate: (valor) =>
                          decimalOpcional(valor) || 'La temperatura no es válida.',
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col sm={4} className="d-flex align-items-end">
                  <Form.Check
                    id={`paso-${campo.id}-control`}
                    type="switch"
                    label="Punto de control"
                    {...form.register(`pasos.${indice}.punto_control`)}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))}
      </div>
      <Button size="sm" variant="outline-primary" onClick={() => append({ ...PASO_VACIO })}>
        <i className="bi bi-plus-lg me-1" aria-hidden="true" />
        Agregar paso
      </Button>
    </>
  );
}

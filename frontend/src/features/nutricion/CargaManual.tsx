import { useState } from 'react';
import { Button, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { numeroDesdeTexto } from './formato';
import {
  FUENTES,
  type FuenteNutricional,
  type Nutriente,
  type NutrienteDisponible,
  type ValorNutricional,
} from './types';

type FuenteManual = Exclude<FuenteNutricional, 'base_referencia'>;

const FUENTES_MANUALES: FuenteManual[] = ['rotulo_proveedor', 'bibliografia', 'valor_propio'];

const AYUDA_DETALLE: Record<FuenteManual, string> = {
  rotulo_proveedor: 'Ej.: Molino San José, harina 000, rótulo 2026',
  bibliografia: 'Ej.: Tabla de composición, autor, año y página',
  valor_propio: 'Ej.: análisis de laboratorio N.º 1234',
};

interface Props {
  show: boolean;
  nutrientes: NutrienteDisponible[];
  actuales: ValorNutricional[];
  onCerrar: () => void;
  onGuardar: (
    fuente: FuenteManual,
    detalle: string,
    valores: Partial<Record<Nutriente, number>>,
  ) => Promise<void>;
}

export function CargaManual({ show, nutrientes, actuales, onCerrar, onGuardar }: Props) {
  const [fuente, setFuente] = useState<FuenteManual>('rotulo_proveedor');
  const [detalle, setDetalle] = useState('');
  const [textos, setTextos] = useState<Partial<Record<Nutriente, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    setTextos({});
    setDetalle('');
    setError(null);
    onCerrar();
  };

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const valores: Partial<Record<Nutriente, number>> = {};
    for (const n of nutrientes) {
      const numero = numeroDesdeTexto(textos[n.nutriente] ?? '');
      if (numero === null) continue;
      if (Number.isNaN(numero) || numero < 0) {
        setError(`${n.etiqueta}: ingresá un número mayor o igual a cero.`);
        return;
      }
      valores[n.nutriente] = numero;
    }
    if (Object.keys(valores).length === 0) {
      setError('Cargá al menos un valor.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(fuente, detalle.trim(), valores);
      cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los valores.');
    } finally {
      setGuardando(false);
    }
  };

  const actual = (nutriente: Nutriente) => actuales.find((v) => v.nutriente === nutriente);

  return (
    <Modal show={show} onHide={cerrar} size="lg" fullscreen="md-down">
      <Form noValidate onSubmit={guardar}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Cargar valores manualmente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col md={5}>
              <Form.Group controlId="CargaManual-fuente">
                <Form.Label>Fuente</Form.Label>
                <Form.Select
                  value={fuente}
                  onChange={(evento) => setFuente(evento.target.value as FuenteManual)}
                >
                  {FUENTES_MANUALES.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {FUENTES[opcion].etiqueta}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={7}>
              <Form.Group controlId="CargaManual-detalle">
                <Form.Label>Detalle de la fuente</Form.Label>
                <Form.Control
                  maxLength={250}
                  placeholder={AYUDA_DETALLE[fuente]}
                  value={detalle}
                  onChange={(evento) => setDetalle(evento.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          <p className="small text-body-secondary">
            Valores por 100 g. Los campos que dejes vacíos conservan su valor actual.
          </p>
          <Row className="g-3">
            {nutrientes.map((n) => {
              const existente = actual(n.nutriente);
              return (
                <Col sm={6} key={n.nutriente}>
                  <Form.Group controlId={`CargaManual-${n.nutriente}`}>
                    <Form.Label className="small mb-1">{n.etiqueta}</Form.Label>
                    <InputGroup size="sm">
                      <Form.Control
                        inputMode="decimal"
                        placeholder={existente ? `Actual: ${existente.valor}` : 'Sin dato'}
                        value={textos[n.nutriente] ?? ''}
                        onChange={(evento) =>
                          setTextos((anterior) => ({
                            ...anterior,
                            [n.nutriente]: evento.target.value,
                          }))
                        }
                      />
                      <InputGroup.Text>{n.unidad}</InputGroup.Text>
                    </InputGroup>
                  </Form.Group>
                </Col>
              );
            })}
          </Row>
          {error && (
            <div className="mt-3">
              <ErrorAlert mensaje={error} />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar valores'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

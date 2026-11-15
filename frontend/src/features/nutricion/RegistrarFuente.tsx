import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FUENTES, type FuenteNutricional, type NutrienteDisponible } from './types';

type FuenteManual = Exclude<FuenteNutricional, 'base_referencia'>;

const OPCIONES: FuenteManual[] = ['rotulo_proveedor', 'bibliografia', 'valor_propio'];

interface Props {
  show: boolean;
  nutrientes: NutrienteDisponible[];
  onCerrar: () => void;
  onGuardar: (fuente: FuenteManual, detalle: string) => Promise<void>;
}

export function RegistrarFuente({ show, nutrientes, onCerrar, onGuardar }: Props) {
  const [fuente, setFuente] = useState<FuenteManual>('rotulo_proveedor');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    setDetalle('');
    setError(null);
    onCerrar();
  };

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!detalle.trim()) {
      setError('Indicá el detalle de la fuente: de dónde sale el dato.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(fuente, detalle.trim());
      cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la fuente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal show={show} onHide={cerrar}>
      <Form noValidate onSubmit={guardar}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Registrar la fuente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-body-secondary">
            Los valores no cambian: solo se deja registrado de dónde salen.{' '}
            <strong>{nutrientes.map((n) => n.etiqueta).join(', ')}</strong>.
          </p>
          <Form.Group controlId="RegistrarFuente-fuente" className="mb-3">
            <Form.Label>Fuente</Form.Label>
            <Form.Select
              value={fuente}
              onChange={(evento) => setFuente(evento.target.value as FuenteManual)}
            >
              {OPCIONES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {FUENTES[opcion].etiqueta}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="RegistrarFuente-detalle">
            <Form.Label>Detalle de la fuente</Form.Label>
            <Form.Control
              maxLength={250}
              placeholder="Ej.: rótulo del proveedor, tabla y página, análisis N.º..."
              value={detalle}
              onChange={(evento) => setDetalle(evento.target.value)}
            />
          </Form.Group>
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
            {guardando ? 'Guardando...' : 'Registrar fuente'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

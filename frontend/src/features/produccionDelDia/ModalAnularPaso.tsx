import { useForm } from 'react-hook-form';
import { Button, Form, Modal } from 'react-bootstrap';
import { FormErrors } from '../../shared/components/FormErrors';
import { anularPaso } from './produccionDelDiaApi';
import type { PasoLote } from './types';

interface ModalAnularPasoProps {
  paso: PasoLote | null;
  onCerrar: () => void;
  onAnulado: () => void;
}

export function ModalAnularPaso({ paso, onCerrar, onAnulado }: ModalAnularPasoProps) {
  const form = useForm<{ motivo: string }>({ defaultValues: { motivo: '' } });
  const { errors, isSubmitting, submitCount } = form.formState;

  const cerrar = () => {
    form.reset();
    onCerrar();
  };

  const enviar = form.handleSubmit(async ({ motivo }) => {
    if (!paso) return;
    try {
      await anularPaso(paso.id, motivo.trim());
      form.reset();
      onAnulado();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo anular el paso.',
      });
    }
  });

  return (
    <Modal show={paso !== null} onHide={cerrar} centered>
      <Form noValidate onSubmit={enviar}>
        <Modal.Header closeButton className="bg-body-tertiary">
          <Modal.Title className="fs-5">
            Anular paso {paso?.orden}: {paso?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <FormErrors key={submitCount} errors={errors} />
          <p className="text-body-secondary">
            El paso vuelve a quedar pendiente. La marca anterior y el motivo quedan registrados en
            el historial del lote.
          </p>
          <Form.Group controlId="paso-motivo-anulacion">
            <Form.Label>Motivo</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              maxLength={250}
              autoFocus
              isInvalid={!!errors.motivo}
              {...form.register('motivo', {
                validate: (valor) => !!valor.trim() || 'Indicá el motivo de la anulación.',
              })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={isSubmitting}>
            {isSubmitting ? 'Anulando...' : 'Anular paso'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

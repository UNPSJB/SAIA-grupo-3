import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Badge, Button, Form, Modal } from 'react-bootstrap';
import { FormErrors } from '../../shared/components/FormErrors';
import { FORMATOS_IMAGEN, validarArchivo } from '../../shared/libreria/archivos';
import { realizarPaso } from './produccionDelDiaApi';
import type { PasoLote } from './types';

interface ModalRealizarPasoProps {
  paso: PasoLote | null;
  onCerrar: () => void;
  onRealizado: () => void;
}

export function ModalRealizarPaso({ paso, onCerrar, onRealizado }: ModalRealizarPasoProps) {
  const form = useForm<{ valorMedido: string; observacion: string }>({
    defaultValues: { valorMedido: '', observacion: '' },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const [foto, setFoto] = useState<File | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const cerrar = () => {
    form.reset();
    setFoto(null);
    setErrorFoto(null);
    onCerrar();
  };

  const enviar = form.handleSubmit(async (valores) => {
    if (!paso) return;
    try {
      await realizarPaso(paso.id, { ...valores, foto });
      form.reset();
      setFoto(null);
      onRealizado();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo marcar el paso.',
      });
    }
  });

  return (
    <Modal show={paso !== null} onHide={cerrar} centered fullscreen="sm-down">
      <Form noValidate onSubmit={enviar}>
        <Modal.Header closeButton className="bg-body-tertiary">
          <Modal.Title className="fs-5">
            Paso {paso?.orden}: {paso?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <FormErrors key={submitCount} errors={errors} />
          {paso && (
            <>
              <p className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                {paso.procedimiento}
              </p>
              {paso.punto_control && (
                <Alert variant="warning" className="py-2">
                  <Badge bg="danger" className="me-2">
                    Punto de control
                  </Badge>
                  Registrá el valor medido para poder marcar el paso.
                </Alert>
              )}
              <Form.Group controlId="paso-valor-medido" className="mb-3">
                <Form.Label>
                  Valor medido{paso.punto_control ? '' : ' — opcional'}
                  {paso.temperatura_celsius !== null && (
                    <span className="text-body-secondary">
                      {' '}
                      (referencia: {paso.temperatura_celsius} °C)
                    </span>
                  )}
                </Form.Label>
                <Form.Control
                  inputMode="decimal"
                  size="lg"
                  autoFocus={paso.punto_control}
                  isInvalid={!!errors.valorMedido}
                  {...form.register('valorMedido', {
                    validate: (valor) => {
                      if (!valor.trim()) return !paso.punto_control || 'Indicá el valor medido.';
                      return (
                        Number.isFinite(Number(valor.trim().replace(',', '.'))) ||
                        'El valor medido debe ser un número.'
                      );
                    },
                  })}
                />
              </Form.Group>
              <Form.Group controlId="paso-observacion" className="mb-3">
                <Form.Label>Observación — opcional</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  maxLength={500}
                  {...form.register('observacion')}
                />
              </Form.Group>
              <Form.Group controlId="paso-foto">
                <Form.Label>
                  <i className="bi bi-camera me-1" aria-hidden="true" />
                  Foto — opcional
                </Form.Label>
                <Form.Control
                  type="file"
                  accept={FORMATOS_IMAGEN}
                  isInvalid={errorFoto !== null}
                  onChange={(evento: React.ChangeEvent<HTMLInputElement>) => {
                    const archivo = evento.target.files?.[0] ?? null;
                    const error = validarArchivo(archivo, FORMATOS_IMAGEN);
                    setErrorFoto(error);
                    setFoto(error ? null : archivo);
                    if (error) evento.target.value = '';
                  }}
                />
                {errorFoto && <Form.Text className="text-danger d-block">{errorFoto}</Form.Text>}
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" size="lg" disabled={isSubmitting}>
            <i className="bi bi-check2 me-1" aria-hidden="true" />
            {isSubmitting ? 'Guardando...' : 'Marcar como hecho'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

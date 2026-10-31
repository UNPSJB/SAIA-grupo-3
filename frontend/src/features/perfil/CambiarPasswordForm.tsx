import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { FormErrors } from '../../shared/components/FormErrors';
import { cambiarPassword } from './perfilApi';
import { MINIMO_CARACTERES_PASSWORD, type CambioPassword } from './types';

const VACIO: CambioPassword = { password_actual: '', password_nueva: '', confirmacion: '' };

export function CambiarPasswordForm() {
  const [cambiada, setCambiada] = useState(false);
  const form = useForm<CambioPassword>({ defaultValues: VACIO });
  const { errors, isSubmitting, submitCount } = form.formState;

  const enviar = form.handleSubmit(async (datos) => {
    setCambiada(false);
    try {
      await cambiarPassword(datos);
      form.reset(VACIO);
      setCambiada(true);
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.',
      });
    }
  });

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-body fw-semibold">
        <i className="bi bi-shield-lock me-2" aria-hidden="true" />
        Cambiar contraseña
      </Card.Header>
      <Card.Body>
        <Form noValidate onSubmit={enviar}>
          <FormErrors key={submitCount} errors={errors} />
          {cambiada && (
            <Alert variant="success" className="py-2">
              Tu contraseña se cambió correctamente.
            </Alert>
          )}
          <Form.Group controlId="perfil-password-actual" className="mb-3">
            <Form.Label>Contraseña actual</Form.Label>
            <Form.Control
              type="password"
              autoComplete="current-password"
              isInvalid={!!errors.password_actual}
              {...form.register('password_actual', {
                required: 'Ingresá tu contraseña actual.',
              })}
            />
          </Form.Group>
          <Form.Group controlId="perfil-password-nueva" className="mb-3">
            <Form.Label>Contraseña nueva</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              isInvalid={!!errors.password_nueva}
              {...form.register('password_nueva', {
                required: 'Ingresá la contraseña nueva.',
                minLength: {
                  value: MINIMO_CARACTERES_PASSWORD,
                  message: `La contraseña nueva debe tener al menos ${MINIMO_CARACTERES_PASSWORD} caracteres.`,
                },
                maxLength: {
                  value: 128,
                  message: 'La contraseña nueva no puede superar los 128 caracteres.',
                },
                validate: (valor, valores) =>
                  valor !== valores.password_actual ||
                  'La contraseña nueva debe ser distinta de la actual.',
              })}
            />
            <Form.Text muted>Mínimo {MINIMO_CARACTERES_PASSWORD} caracteres.</Form.Text>
          </Form.Group>
          <Form.Group controlId="perfil-password-confirmacion" className="mb-3">
            <Form.Label>Repetí la contraseña nueva</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              isInvalid={!!errors.confirmacion}
              {...form.register('confirmacion', {
                required: 'Repetí la contraseña nueva.',
                validate: (valor, valores) =>
                  valor === valores.password_nueva ||
                  'La confirmación no coincide con la contraseña nueva.',
              })}
            />
          </Form.Group>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

import { useForm } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import type { LoginData } from './types';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';

export function LoginPage() {
  const form = useForm<LoginData>({ defaultValues: { username: '', password: '' } });
  const { isAuthenticated, isLoading, login, error } = useAuth();

  const handleSubmit = form.handleSubmit(async (data) => {
    await login(data);
  });

  if (isLoading && !form.formState.isSubmitting)
    return (
      <div className="vh-100 d-flex align-items-center">
        <LoadingSpinner mensaje="Autenticando..." />
      </div>
    );
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center vh-100 bg-body-tertiary"
    >
      <Card style={{ width: '420px' }} className="shadow-lg border-0 rounded-4">
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <h3 className="fw-bold text-primary">SAIA</h3>
            <p className="text-muted small">Sistema de Apoyo a la Inocuidad Alimentaria</p>
          </div>
          {error && (
            <Alert variant="danger" className="small py-2">
              {error}
            </Alert>
          )}
          <Form noValidate onSubmit={handleSubmit}>
            <FormErrors errors={form.formState.errors} />
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-muted">
                Usuario (Email, DNI o Username)
              </Form.Label>
              <Form.Control
                type="text"
                {...form.register('username', {
                  validate: (value) => !!value.trim() || 'Ingresá tu usuario.',
                })}
                autoComplete="username"
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-semibold text-muted">Contraseña</Form.Label>
              <Form.Control
                type="password"
                {...form.register('password', { required: 'Ingresá tu contraseña.' })}
                autoComplete="current-password"
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              className="w-100 py-2 fw-semibold"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Ingresando...' : 'Ingresar al sistema'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

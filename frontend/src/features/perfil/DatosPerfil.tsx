import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { FormErrors } from '../../shared/components/FormErrors';
import { actualizarEmail } from './perfilApi';
import type { Perfil } from './types';

interface DatosPerfilProps {
  perfil: Perfil;
  onActualizado: (perfil: Perfil) => void;
}

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Col sm={6} className="mb-3">
      <div className="small text-body-secondary">{etiqueta}</div>
      <div className="fw-semibold text-break">{valor}</div>
    </Col>
  );
}

export function DatosPerfil({ perfil, onActualizado }: DatosPerfilProps) {
  const [editando, setEditando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const form = useForm<{ email: string }>({ defaultValues: { email: perfil.email } });
  const { errors, isSubmitting, submitCount } = form.formState;

  const empezarEdicion = () => {
    form.reset({ email: perfil.email });
    setGuardado(false);
    setEditando(true);
  };

  const enviar = form.handleSubmit(async ({ email }) => {
    try {
      const actualizado = await actualizarEmail(email.trim());
      onActualizado(actualizado);
      setEditando(false);
      setGuardado(true);
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo actualizar el email.',
      });
    }
  });

  const sinPermisos = !perfil.operar && !perfil.administrar;

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-body fw-semibold">
        <i className="bi bi-person-vcard me-2" aria-hidden="true" />
        Mis datos
      </Card.Header>
      <Card.Body>
        <Row>
          <Dato etiqueta="Nombre" valor={perfil.nombre} />
          <Dato etiqueta="Apellido" valor={perfil.apellido} />
          <Dato etiqueta="DNI" valor={perfil.dni} />
          <Dato etiqueta="Legajo" valor={perfil.nroLegajo} />
          <Dato etiqueta="Usuario" valor={perfil.username} />
          <Col sm={6} className="mb-3">
            <div className="small text-body-secondary">Permisos</div>
            <div className="d-flex flex-wrap gap-1 mt-1">
              {perfil.administrar && <Badge bg="primary">Administrar</Badge>}
              {perfil.operar && <Badge bg="success">Operar</Badge>}
              {sinPermisos && <Badge bg="secondary">Sin permisos</Badge>}
            </div>
          </Col>
        </Row>

        <hr className="mt-0" />
        <div className="small text-body-secondary">Email</div>
        {editando ? (
          <Form noValidate onSubmit={enviar} className="mt-1">
            <FormErrors key={submitCount} errors={errors} />
            <Form.Group controlId="perfil-email" className="mb-2">
              <Form.Label className="visually-hidden">Email</Form.Label>
              <Form.Control
                type="email"
                autoFocus
                isInvalid={!!errors.email}
                {...form.register('email', {
                  validate: (valor) =>
                    PATRON_EMAIL.test(valor.trim()) || 'Ingresá un email válido.',
                })}
              />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setEditando(false)}
              >
                Cancelar
              </Button>
            </div>
          </Form>
        ) : (
          <div className="d-flex align-items-center justify-content-between gap-2">
            <span className="fw-semibold text-break">{perfil.email}</span>
            <Button variant="outline-secondary" size="sm" onClick={empezarEdicion}>
              <i className="bi bi-pencil me-1" aria-hidden="true" />
              Cambiar
            </Button>
          </div>
        )}
        {guardado && (
          <Alert variant="success" className="mt-3 mb-0 py-2 small">
            Email actualizado.
          </Alert>
        )}
        <p className="small text-body-secondary mt-3 mb-0">
          Para corregir tu DNI, legajo o permisos pedíselo a administración.
        </p>
      </Card.Body>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type {
  Personal,
  PersonalCreateInput,
  PersonalUpdateInput,
} from './types';

interface PersonalFormProps {
  personalInicial?: Personal | null;
  onGuardar: (
    datos: PersonalCreateInput | PersonalUpdateInput
  ) => Promise<void>;
  onCancelar: () => void;
}

export function PersonalForm({
  personalInicial,
  onGuardar,
  onCancelar,
}: PersonalFormProps) {
  const [dni, setDni] = useState('');
  const [nroLegajo, setNroLegajo] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [operar, setOperar] = useState(false);
  const [administrar, setAdministrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const esEdicion = Boolean(personalInicial);

  useEffect(() => {
    if (!personalInicial) return;

    setDni(personalInicial.dni);
    setNroLegajo(personalInicial.nroLegajo);
    setNombre(personalInicial.nombre);
    setApellido(personalInicial.apellido);
    setEmail(personalInicial.email);
    setUsername(personalInicial.username);
    setOperar(personalInicial.operar);
    setAdministrar(personalInicial.administrar);
    setPassword('');
  }, [personalInicial]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorEnvio(null);

    const form = e.currentTarget;

    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setEnviando(true);

    try {
      const datos = {
        dni: dni.trim(),
        nroLegajo: nroLegajo.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        username: username.trim(),
        operar,
        administrar,
      };

      if (esEdicion) {
        await onGuardar({
          ...datos,
          ...(password ? { password } : {}),
        });
      } else {
        await onGuardar({
          ...datos,
          password,
        });
      }
    } catch (err: unknown) {
      setErrorEnvio(
        err instanceof Error ? err.message : 'Error al guardar los datos.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion
          ? `Modificar Personal: ${personalInicial?.apellido}, ${personalInicial?.nombre}`
          : 'Registrar Nuevo Personal'}
      </Card.Header>

      <Card.Body className="p-4">
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          {errorEnvio && <ErrorAlert mensaje={errorEnvio} />}

          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>DNI</Form.Label>
              <Form.Control
                required
                maxLength={20}
                disabled={esEdicion}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Ingresá el DNI.
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label>N° de Legajo</Form.Label>
              <Form.Control
                required
                maxLength={20}
                value={nroLegajo}
                onChange={(e) => setNroLegajo(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Ingresá el número de legajo.
              </Form.Control.Feedback>
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                required
                maxLength={50}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Apellido</Form.Label>
              <Form.Control
                required
                maxLength={50}
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Correo electrónico</Form.Label>
              <Form.Control
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Nombre de usuario</Form.Label>
              <Form.Control
                required
                minLength={3}
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>
              {esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            </Form.Label>
            <Form.Control
              type="password"
              required={!esEdicion}
              minLength={4}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Form.Text className="text-muted">
              {esEdicion
                ? 'Dejala vacía para conservar la contraseña actual.'
                : 'Debe tener al menos 4 caracteres.'}
            </Form.Text>
          </Form.Group>

          <fieldset className="mb-4">
            <legend className="fs-6">Permisos en el sistema</legend>

            <Form.Check
              type="checkbox"
              label="Puede operar"
              checked={operar}
              onChange={(e) => setOperar(e.target.checked)}
            />

            <Form.Check
              type="checkbox"
              label="Puede administrar"
              checked={administrar}
              onChange={(e) => setAdministrar(e.target.checked)}
            />

            <Form.Text className="text-muted">
              Podés habilitar ambos permisos para la misma persona.
            </Form.Text>
          </fieldset>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="secondary"
              onClick={onCancelar}
              disabled={enviando}
            >
              Cancelar
            </Button>

            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando
                ? 'Guardando...'
                : esEdicion
                  ? 'Actualizar Cambios'
                  : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
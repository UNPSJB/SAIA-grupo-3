import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { useEffect, useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Personal, PersonalCreateInput, PersonalUpdateInput } from './types';

interface PersonalFormProps {
  personalInicial?: Personal | null;
  onGuardar: (datos: PersonalCreateInput | PersonalUpdateInput) => Promise<void>;
  onCancelar: () => void;
}

export function PersonalForm({ personalInicial, onGuardar, onCancelar }: PersonalFormProps) {
  const esEdicion = Boolean(personalInicial);
  const form = useForm<{
    dni: string;
    nroLegajo: string;
    nombre: string;
    apellido: string;
    email: string;
    username: string;
    password: string;
    operar: boolean;
    administrar: boolean;
  }>({
    defaultValues: {
      dni: '',
      nroLegajo: '',
      nombre: '',
      apellido: '',
      email: '',
      username: '',
      password: '',
      operar: false,
      administrar: false,
    },
  });
  const enviando = form.formState.isSubmitting;
  const {
    field: { value: dni, onChange: setDni, onBlur: dniBlur, ref: dniRef, name: dniName },
  } = useController({
    name: 'dni',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      maxLength: { value: 20, message: 'Texto demasiado largo.' },
    },
  });
  const {
    field: {
      value: nroLegajo,
      onChange: setNroLegajo,
      onBlur: nroLegajoBlur,
      ref: nroLegajoRef,
      name: nroLegajoName,
    },
  } = useController({
    name: 'nroLegajo',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      maxLength: { value: 20, message: 'Texto demasiado largo.' },
    },
  });
  const {
    field: {
      value: nombre,
      onChange: setNombre,
      onBlur: nombreBlur,
      ref: nombreRef,
      name: nombreName,
    },
  } = useController({
    name: 'nombre',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      maxLength: { value: 50, message: 'Texto demasiado largo.' },
    },
  });
  const {
    field: {
      value: apellido,
      onChange: setApellido,
      onBlur: apellidoBlur,
      ref: apellidoRef,
      name: apellidoName,
    },
  } = useController({
    name: 'apellido',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      maxLength: { value: 50, message: 'Texto demasiado largo.' },
    },
  });
  const {
    field: { value: email, onChange: setEmail, onBlur: emailBlur, ref: emailRef, name: emailName },
  } = useController({
    name: 'email',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresá un correo válido.' },
    },
  });
  const {
    field: {
      value: username,
      onChange: setUsername,
      onBlur: usernameBlur,
      ref: usernameRef,
      name: usernameName,
    },
  } = useController({
    name: 'username',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      minLength: { value: 3, message: 'Texto demasiado corto.' },
      maxLength: { value: 50, message: 'Texto demasiado largo.' },
    },
  });
  const {
    field: {
      value: password,
      onChange: setPassword,
      onBlur: passwordBlur,
      ref: passwordRef,
      name: passwordName,
    },
  } = useController({
    name: 'password',
    control: form.control,
    rules: {
      validate: (value) =>
        !!esEdicion ||
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      minLength: { value: 4, message: 'Texto demasiado corto.' },
    },
  });
  const {
    field: {
      value: operar,
      onChange: setOperar,
      onBlur: operarBlur,
      ref: operarRef,
      name: operarName,
    },
  } = useController({ name: 'operar', control: form.control, rules: {} });
  const {
    field: {
      value: administrar,
      onChange: setAdministrar,
      onBlur: administrarBlur,
      ref: administrarRef,
      name: administrarName,
    },
  } = useController({ name: 'administrar', control: form.control, rules: {} });
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

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
  }, [
    personalInicial,
    setDni,
    setNroLegajo,
    setNombre,
    setApellido,
    setEmail,
    setUsername,
    setPassword,
    setOperar,
    setAdministrar,
  ]);

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    setErrorEnvio(null);

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
      setErrorEnvio(err instanceof Error ? err.message : 'Error al guardar los datos.');
    }
  });

  return (
    <Card className="shadow-sm border-0">
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion
          ? `Modificar Personal: ${personalInicial?.apellido}, ${personalInicial?.nombre}`
          : 'Registrar Nuevo Personal'}
      </Card.Header>

      <Card.Body className="p-4">
        <Form noValidate onSubmit={handleSubmit}>
          <FormErrors errors={form.formState.errors} />
          {errorEnvio && <ErrorAlert mensaje={errorEnvio} />}

          <div className="row">
            <Form.Group controlId="PersonalForm-dni" className="col-md-6 mb-3">
              <Form.Label>DNI</Form.Label>
              <Form.Control
                required
                maxLength={20}
                disabled={esEdicion}
                ref={dniRef}
                onBlur={dniBlur}
                name={dniName}
                value={dni}
                isInvalid={!!form.formState.errors.dni}
                onChange={(e) => setDni(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">Ingresá el DNI.</Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="PersonalForm-nroLegajo" className="col-md-6 mb-3">
              <Form.Label>N° de Legajo</Form.Label>
              <Form.Control
                required
                maxLength={20}
                ref={nroLegajoRef}
                onBlur={nroLegajoBlur}
                name={nroLegajoName}
                value={nroLegajo}
                isInvalid={!!form.formState.errors.nroLegajo}
                onChange={(e) => setNroLegajo(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Ingresá el número de legajo.
              </Form.Control.Feedback>
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group controlId="PersonalForm-nombre" className="col-md-6 mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                required
                maxLength={50}
                ref={nombreRef}
                onBlur={nombreBlur}
                name={nombreName}
                value={nombre}
                isInvalid={!!form.formState.errors.nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="PersonalForm-apellido" className="col-md-6 mb-3">
              <Form.Label>Apellido</Form.Label>
              <Form.Control
                required
                maxLength={50}
                ref={apellidoRef}
                onBlur={apellidoBlur}
                name={apellidoName}
                value={apellido}
                isInvalid={!!form.formState.errors.apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group controlId="PersonalForm-email" className="col-md-6 mb-3">
              <Form.Label>Correo electrónico</Form.Label>
              <Form.Control
                type="email"
                required
                ref={emailRef}
                onBlur={emailBlur}
                name={emailName}
                value={email}
                isInvalid={!!form.formState.errors.email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="PersonalForm-username" className="col-md-6 mb-3">
              <Form.Label>Nombre de usuario</Form.Label>
              <Form.Control
                required
                minLength={3}
                maxLength={50}
                ref={usernameRef}
                onBlur={usernameBlur}
                name={usernameName}
                value={username}
                isInvalid={!!form.formState.errors.username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>
          </div>

          <Form.Group controlId="PersonalForm-password" className="mb-3">
            <Form.Label>{esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Form.Label>
            <Form.Control
              type="password"
              required={!esEdicion}
              minLength={4}
              autoComplete="new-password"
              ref={passwordRef}
              onBlur={passwordBlur}
              name={passwordName}
              value={password}
              isInvalid={!!form.formState.errors.password}
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
              ref={operarRef}
              onBlur={operarBlur}
              name={operarName}
              checked={operar}
              isInvalid={!!form.formState.errors.operar}
              onChange={(e) => setOperar(e.target.checked)}
            />

            <Form.Check
              type="checkbox"
              label="Puede administrar"
              ref={administrarRef}
              onBlur={administrarBlur}
              name={administrarName}
              checked={administrar}
              isInvalid={!!form.formState.errors.administrar}
              onChange={(e) => setAdministrar(e.target.checked)}
            />

            <Form.Text className="text-muted">
              Podés habilitar ambos permisos para la misma persona.
            </Form.Text>
          </fieldset>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>

            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import type { Proveedor, ProveedorInput } from './types';

const campos = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', obligatorio: true, max: 150 },
  { nombre: 'cuit', etiqueta: 'CUIT', tipo: 'text', obligatorio: true, max: 20 },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', obligatorio: false, max: 40 },
  { nombre: 'email', etiqueta: 'Email', tipo: 'email', obligatorio: false, max: 254 },
  {
    nombre: 'numero_habilitacion',
    etiqueta: 'Número de habilitación',
    tipo: 'text',
    obligatorio: false,
    max: 100,
  },
  {
    nombre: 'vencimiento_habilitacion',
    etiqueta: 'Vencimiento de habilitación',
    tipo: 'date',
    obligatorio: false,
    max: undefined,
  },
] as const;

export function ProveedorForm({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: Proveedor | null;
  onGuardar: (datos: ProveedorInput) => Promise<void>;
  onCancelar: () => void;
}) {
  const [datos, setDatos] = useState<ProveedorInput>(() => ({
    nombre: inicial?.nombre ?? '',
    cuit: inicial?.cuit ?? '',
    telefono: inicial?.telefono ?? '',
    email: inicial?.email ?? '',
    numero_habilitacion: inicial?.numero_habilitacion ?? '',
    vencimiento_habilitacion: inicial?.vencimiento_habilitacion ?? '',
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await onGuardar({
        ...datos,
        nombre: datos.nombre.trim(),
        cuit: datos.cuit.trim(),
        telefono: datos.telefono?.trim() || null,
        email: datos.email?.trim() || null,
        numero_habilitacion: datos.numero_habilitacion?.trim() || null,
        vencimiento_habilitacion: datos.vencimiento_habilitacion || null,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {inicial ? `Modificar Proveedor: ${inicial.nombre}` : 'Registrar Nuevo Proveedor'}
      </Card.Header>
      <Card.Body className="p-4">
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={enviar}>
          <fieldset disabled={guardando}>
            <div className="d-flex flex-column">
              {campos.map((campo) => (
                <Form.Group
                  className="mb-3"
                  controlId={`proveedor-${campo.nombre}`}
                  key={campo.nombre}
                >
                  <Form.Label>
                    {campo.etiqueta}
                    {campo.obligatorio ? '' : ' (opcional)'}
                  </Form.Label>
                  <Form.Control
                    type={campo.tipo}
                    required={campo.obligatorio}
                    maxLength={campo.max}
                    value={datos[campo.nombre] ?? ''}
                    onChange={(event) =>
                      setDatos((anterior) => ({ ...anterior, [campo.nombre]: event.target.value }))
                    }
                  />
                </Form.Group>
              ))}
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={onCancelar}>
                Cancelar
              </Button>
              <Button type="submit">
                {guardando ? 'Guardando...' : inicial ? 'Actualizar Cambios' : 'Guardar'}
              </Button>
            </div>
          </fieldset>
        </Form>
      </Card.Body>
    </Card>
  );
}

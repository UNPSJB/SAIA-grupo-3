import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { ListPagination } from '../../shared/components/ListPagination';
import { formatearFecha } from '../../shared/libreria/fechas';
import { cambiarEstadoProveedor, guardarProveedor, listarProveedores } from './abastecimientoApi';
import { EstadoLote } from './EstadoLote';
import type { Proveedor, ProveedorInput } from './types';
import { useConsulta } from './useConsulta';

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

function FormularioProveedor({
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
    <Card className="mb-4">
      <Card.Body>
        <h4>{inicial ? 'Editar proveedor' : 'Nuevo proveedor'}</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={enviar}>
          <fieldset disabled={guardando}>
            <div className="row g-3">
              {campos.map((campo) => (
                <Form.Group
                  className="col-12 col-md-6"
                  controlId={`proveedor-${campo.nombre}`}
                  key={campo.nombre}
                >
                  <Form.Label>
                    {campo.etiqueta}
                    {campo.obligatorio ? ' *' : ''}
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
              <Button type="submit">{guardando ? 'Guardando...' : 'Guardar proveedor'}</Button>
            </div>
          </fieldset>
        </Form>
      </Card.Body>
    </Card>
  );
}

export function ProveedoresPage() {
  const [params, setParams] = useSearchParams();
  const consulta = params.toString();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [formulario, setFormulario] = useState<{ proveedor: Proveedor | null } | null>(null);
  const [confirmacion, setConfirmacion] = useState<Proveedor | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const cargar = useCallback(
    (signal: AbortSignal) =>
      listarProveedores(Object.fromEntries(new URLSearchParams(consulta)), signal),
    [consulta],
  );
  const listado = useConsulta(cargar);

  function filtrar(clave: string, valor: string) {
    setParams(
      (anteriores) => {
        const nuevos = new URLSearchParams(anteriores);
        if (valor) nuevos.set(clave, valor);
        else nuevos.delete(clave);
        if (clave !== 'page') nuevos.set('page', '1');
        return nuevos;
      },
      { replace: true },
    );
  }

  async function guardar(datos: ProveedorInput) {
    await guardarProveedor(datos, formulario?.proveedor?.id);
    setFormulario(null);
    setMensaje('El proveedor se guardó correctamente.');
    filtrar('page', '1');
    listado.recargar();
  }

  async function confirmarEstado() {
    if (!confirmacion) return;
    setOcupado(true);
    setErrorAccion('');
    try {
      await cambiarEstadoProveedor(confirmacion.id, !confirmacion.activo);
      setConfirmacion(null);
      setMensaje('El estado del proveedor se actualizó.');
      filtrar('page', '1');
      listado.recargar();
    } catch (error) {
      setErrorAccion(error instanceof Error ? error.message : 'No se pudo actualizar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="py-3">
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-4">
        <div>
          <h2>Proveedores</h2>
          <p className="text-body-secondary mb-0">
            Origen y habilitaciones de quienes suministran tus insumos.
          </p>
        </div>
        <Button
          className="align-self-start"
          onClick={() => {
            setFormulario({ proveedor: null });
            setMensaje('');
          }}
        >
          Nuevo proveedor
        </Button>
      </div>
      {mensaje && (
        <Alert variant="success" role="status">
          {mensaje}
        </Alert>
      )}
      {(listado.error || errorAccion) && (
        <Alert variant="danger">{errorAccion || listado.error}</Alert>
      )}
      {formulario && (
        <FormularioProveedor
          key={formulario.proveedor?.id ?? 'nuevo'}
          inicial={formulario.proveedor}
          onGuardar={guardar}
          onCancelar={() => setFormulario(null)}
        />
      )}
      {confirmacion && (
        <Alert variant={confirmacion.activo ? 'warning' : 'info'}>
          <p>
            ¿Querés {confirmacion.activo ? 'dar de baja' : 'reactivar'} a{' '}
            <strong>{confirmacion.nombre}</strong>? Sus recepciones anteriores se conservan.
          </p>
          <div className="d-flex gap-2">
            <Button disabled={ocupado} onClick={() => void confirmarEstado()}>
              Confirmar
            </Button>
            <Button variant="secondary" disabled={ocupado} onClick={() => setConfirmacion(null)}>
              Cancelar
            </Button>
          </div>
        </Alert>
      )}
      <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
        <Form.Control
          type="search"
          aria-label="Buscar proveedor por nombre o CUIT"
          placeholder="Buscar por nombre o CUIT..."
          value={params.get('buscar') ?? ''}
          onChange={(event) => filtrar('buscar', event.target.value)}
          style={{ flex: '1 1 240px', width: 'auto' }}
        />
        <Form.Check
          id="proveedores-inactivos"
          type="switch"
          label="Incluir dados de baja"
          checked={params.get('mostrar_inactivos') === 'true'}
          onChange={(event) => filtrar('mostrar_inactivos', String(event.target.checked))}
        />
        <Button variant="outline-secondary" onClick={listado.recargar} disabled={listado.cargando}>
          Actualizar
        </Button>
      </div>
      {listado.cargando ? (
        <p role="status">Cargando proveedores...</p>
      ) : (
        <>
          <Table responsive striped hover className="align-middle">
            <thead className="table-theme">
              <tr>
                <th>Proveedor</th>
                <th>CUIT</th>
                <th>Contacto</th>
                <th>Habilitación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listado.datos?.items.map((proveedor) => (
                <tr key={proveedor.id}>
                  <td>{proveedor.nombre}</td>
                  <td className="text-nowrap">{proveedor.cuit}</td>
                  <td>
                    <div>{proveedor.telefono || 'Sin teléfono'}</div>
                    <small>{proveedor.email || 'Sin email'}</small>
                  </td>
                  <td>
                    <div>{proveedor.numero_habilitacion || 'Sin registrar'}</div>
                    {proveedor.vencimiento_habilitacion && (
                      <>
                        <small>{formatearFecha(proveedor.vencimiento_habilitacion)}</small>
                        {proveedor.habilitacion_estado && (
                          <div>
                            <EstadoLote estado={proveedor.habilitacion_estado} />
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    <Badge bg={proveedor.activo ? 'success' : 'secondary'}>
                      {proveedor.activo ? 'Activo' : 'Dado de baja'}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => setFormulario({ proveedor })}
                      >
                        Editar
                      </Button>
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/recepciones-insumos?proveedor_id=${proveedor.id}`}
                      >
                        Ver lotes
                      </Link>
                      <Button
                        size="sm"
                        variant={proveedor.activo ? 'outline-danger' : 'outline-success'}
                        onClick={() => {
                          setConfirmacion(proveedor);
                          setErrorAccion('');
                        }}
                      >
                        {proveedor.activo ? 'Dar de baja' : 'Reactivar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!listado.datos?.items.length && (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    No hay proveedores para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <ListPagination
            page={page}
            totalPages={listado.datos?.pages ?? 0}
            total={listado.datos?.total ?? 0}
            changePage={(valor) => filtrar('page', String(valor))}
          />
        </>
      )}
    </div>
  );
}

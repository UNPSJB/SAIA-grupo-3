import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Card, Form, InputGroup, Modal, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FormErrors } from '../../shared/components/FormErrors';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { fechaHoyIso } from '../../shared/libreria/fechas';
import { useAuth } from '../../shared/hooks/useAuth';
import { InsumoForm } from '../insumos/InsumoForm';
import { createInsumo } from '../insumos/InsumoApi';
import type { InsumoCreate } from '../insumos/types';
import { ProductoForm } from '../productos/ProductoForm';
import { createProducto, getProductosActivos } from '../productos/productoApi';
import type { Producto, ProductoCreate } from '../productos/types';
import { getInsumosDisponibles } from './loteProduccionApi';
import type { InsumoSeleccionable, LoteProduccionCreate } from './types';

interface LoteProduccionFormProps {
  onGuardar: (datos: LoteProduccionCreate) => Promise<void>;
  onCancelar: () => void;
}

interface ValoresLote {
  productoId: string;
  fechaProduccion: string;
  cantidad: string;
  observaciones: string;
}

interface InsumoSeleccionado {
  insumo: InsumoSeleccionable;
  cantidadUsada: string;
}

export function LoteProduccionForm({ onGuardar, onCancelar }: LoteProduccionFormProps) {
  const { currentUser } = useAuth();
  const esAdministrador = currentUser?.administrar === true;
  const hoy = fechaHoyIso();
  const form = useForm<ValoresLote>({
    defaultValues: { productoId: '', fechaProduccion: hoy, cantidad: '', observaciones: '' },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);
  const [insumos, setInsumos] = useState<InsumoSeleccionable[]>([]);
  const [insumosSeleccionados, setInsumosSeleccionados] = useState<InsumoSeleccionado[]>([]);
  const [cargandoInsumos, setCargandoInsumos] = useState(true);
  const [errorInsumos, setErrorInsumos] = useState<string | null>(null);
  const [mostrarInsumos, setMostrarInsumos] = useState(false);
  const [mostrarNuevoInsumo, setMostrarNuevoInsumo] = useState(false);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');

  useEffect(() => {
    let activo = true;
    getProductosActivos()
      .then((datos) => {
        if (activo) setProductos(datos);
      })
      .catch((err: unknown) => {
        if (activo)
          setErrorProductos(
            err instanceof Error ? err.message : 'No se pudieron cargar los productos.',
          );
      })
      .finally(() => {
        if (activo) setCargandoProductos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    getInsumosDisponibles()
      .then((datos) => {
        if (activo) setInsumos(datos);
      })
      .catch((err: unknown) => {
        if (activo)
          setErrorInsumos(
            err instanceof Error ? err.message : 'No se pudieron cargar los insumos.',
          );
      })
      .finally(() => {
        if (activo) setCargandoInsumos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const productoId = useWatch({ control: form.control, name: 'productoId' });
  const productoElegido = productos.find((producto) => String(producto.id) === productoId);

  const crearProducto = async (datos: ProductoCreate) => {
    const nuevo = await createProducto(datos);
    setProductos((actuales) =>
      [...actuales, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    form.setValue('productoId', String(nuevo.id));
    form.clearErrors('productoId');
    setMostrarNuevoProducto(false);
  };

  const agregarInsumo = (insumo: InsumoSeleccionable) => {
    setInsumosSeleccionados((actuales) =>
      actuales.some((seleccionado) => seleccionado.insumo.id === insumo.id)
        ? actuales
        : [...actuales, { insumo, cantidadUsada: '' }],
    );
  };

  const alternarInsumo = (insumo: InsumoSeleccionable) => {
    setInsumosSeleccionados((actuales) =>
      actuales.some((seleccionado) => seleccionado.insumo.id === insumo.id)
        ? actuales.filter((seleccionado) => seleccionado.insumo.id !== insumo.id)
        : [...actuales, { insumo, cantidadUsada: '' }],
    );
  };

  const crearInsumo = async (datos: InsumoCreate) => {
    const nuevo = await createInsumo(datos);
    if (!nuevo.unidadMedidaObj)
      throw new Error('El insumo se creó, pero no se recibió su unidad de medida.');
    const insumoDisponible: InsumoSeleccionable = {
      id: nuevo.id,
      nombre: nuevo.nombre,
      unidadMedidaObj: nuevo.unidadMedidaObj,
    };
    setInsumos((actuales) =>
      [...actuales, insumoDisponible].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    agregarInsumo(insumoDisponible);
    setMostrarNuevoInsumo(false);
  };

  const enviar = form.handleSubmit(async (valores) => {
    const hayCantidadInvalida = insumosSeleccionados.some(
      ({ cantidadUsada }) => !Number.isFinite(Number(cantidadUsada)) || Number(cantidadUsada) <= 0,
    );
    if (hayCantidadInvalida) {
      form.setError('root', { message: 'Indicá una cantidad mayor a cero para cada insumo.' });
      return;
    }
    form.clearErrors('root');
    try {
      await onGuardar({
        producto_id: Number(valores.productoId),
        fecha_produccion: valores.fechaProduccion,
        cantidad: Number(valores.cantidad),
        observaciones: valores.observaciones.trim() || null,
        insumos: insumosSeleccionados.map(({ insumo, cantidadUsada }) => ({
          insumo_id: insumo.id,
          cantidad_usada: Number(cantidadUsada),
        })),
      });
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al registrar el lote.',
      });
    }
  });

  const insumosFiltrados = insumos.filter((insumo) =>
    insumo.nombre.toLocaleLowerCase().includes(busquedaInsumo.trim().toLocaleLowerCase()),
  );

  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          Registrar Lote de Producción
        </Card.Header>
        <Card.Body className="p-4">
          <Form noValidate onSubmit={enviar}>
            <FormErrors key={submitCount} errors={errors} />
            {errorProductos && <ErrorAlert mensaje={errorProductos} />}
            <Form.Group controlId="LoteForm-producto" className="mb-3">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <Form.Label className="mb-0">Producto</Form.Label>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => setMostrarNuevoProducto(true)}
                  className="d-flex align-items-center gap-1"
                >
                  <i className="bi bi-plus-lg"></i> Nuevo producto
                </Button>
              </div>
              <SearchableSelect
                isInvalid={!!errors.productoId}
                disabled={cargandoProductos}
                {...form.register('productoId', { required: 'Elegí el producto que se produjo.' })}
                value={productoId}
              >
                <option value="">
                  {cargandoProductos ? 'Cargando productos...' : 'Seleccioná un producto...'}
                </option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
              </SearchableSelect>
              {!cargandoProductos && productos.length === 0 && (
                <Form.Text>
                  Todavía no hay productos: creá el primero con “Nuevo producto”.
                </Form.Text>
              )}
            </Form.Group>
            <div className="row">
              <Form.Group controlId="LoteForm-fecha" className="col-sm-6 mb-3">
                <Form.Label>Fecha de producción</Form.Label>
                <Form.Control
                  type="date"
                  max={hoy}
                  isInvalid={!!errors.fechaProduccion}
                  {...form.register('fechaProduccion', {
                    required: 'Indicá la fecha de producción.',
                    validate: (valor) =>
                      valor <= hoy || 'La fecha de producción no puede ser posterior a hoy.',
                  })}
                />
              </Form.Group>
              <Form.Group controlId="LoteForm-cantidad" className="col-sm-6 mb-3">
                <Form.Label>Cantidad producida</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ej: 24"
                    isInvalid={!!errors.cantidad}
                    {...form.register('cantidad', {
                      required: 'Indicá la cantidad producida.',
                      validate: (valor) =>
                        Number(valor) > 0 || 'La cantidad debe ser mayor a cero.',
                    })}
                  />
                  {productoElegido && (
                    <InputGroup.Text>{productoElegido.unidad_medida.sufijo}</InputGroup.Text>
                  )}
                </InputGroup>
              </Form.Group>
            </div>
            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Insumos utilizados (opcional)</Form.Label>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setMostrarInsumos(true)}
                    disabled={cargandoInsumos}
                  >
                    <i className="bi bi-card-list"></i> Agregar
                  </Button>
                  {esAdministrador && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => setMostrarNuevoInsumo(true)}
                    >
                      <i className="bi bi-plus-lg"></i> Nuevo
                    </Button>
                  )}
                </div>
              </div>
              {errorInsumos && <ErrorAlert mensaje={errorInsumos} />}
              {insumosSeleccionados.length === 0 ? (
                <p className="text-muted small mb-0">Todavía no agregaste insumos al lote.</p>
              ) : (
                <div className="border rounded bg-body">
                  <Table size="sm" striped hover className="mb-0 align-middle">
                    <tbody>
                      {insumosSeleccionados.map(({ insumo, cantidadUsada }) => (
                        <tr key={insumo.id}>
                          <td className="ps-3 py-2">{insumo.nombre}</td>
                          <td className="py-2" style={{ width: '220px' }}>
                            <InputGroup size="sm">
                              <Form.Control
                                type="number"
                                min="0"
                                step="any"
                                value={cantidadUsada}
                                aria-label={`Cantidad utilizada de ${insumo.nombre}`}
                                onChange={(evento) => {
                                  const valor = evento.target.value;
                                  setInsumosSeleccionados((actuales) =>
                                    actuales.map((seleccionado) =>
                                      seleccionado.insumo.id === insumo.id
                                        ? { ...seleccionado, cantidadUsada: valor }
                                        : seleccionado,
                                    ),
                                  );
                                }}
                              />
                              <InputGroup.Text>{insumo.unidadMedidaObj.sufijo}</InputGroup.Text>
                            </InputGroup>
                          </td>
                          <td className="text-end pe-3 py-2" style={{ width: '80px' }}>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              aria-label={`Quitar ${insumo.nombre}`}
                              onClick={() =>
                                setInsumosSeleccionados((actuales) =>
                                  actuales.filter(
                                    (seleccionado) => seleccionado.insumo.id !== insumo.id,
                                  ),
                                )
                              }
                            >
                              <i className="bi bi-x-circle"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Form.Group>
            <Form.Group controlId="LoteForm-observaciones" className="mb-4">
              <Form.Label>Observaciones (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Ej: Horneado en el turno mañana"
                isInvalid={!!errors.observaciones}
                {...form.register('observaciones', {
                  maxLength: {
                    value: 500,
                    message: 'Las observaciones no pueden superar los 500 caracteres.',
                  },
                })}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Registrar lote'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal show={mostrarNuevoProducto} onHide={() => setMostrarNuevoProducto(false)} centered>
        <Modal.Header closeButton className="bg-body-tertiary">
          <Modal.Title className="text-secondary fs-5">Nuevo producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mostrarNuevoProducto && (
            <ProductoForm
              enModal
              onGuardar={crearProducto}
              onCancelar={() => setMostrarNuevoProducto(false)}
            />
          )}
        </Modal.Body>
      </Modal>

      <Modal show={mostrarInsumos} onHide={() => setMostrarInsumos(false)} size="lg">
        <Modal.Header closeButton className="bg-body-tertiary">
          <Modal.Title className="text-secondary fs-5">Seleccionar insumos existentes</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="p-3">
            <Form.Control
              type="search"
              aria-label="Buscar insumos"
              placeholder="Buscar insumos..."
              value={busquedaInsumo}
              onChange={(evento) => setBusquedaInsumo(evento.target.value)}
            />
          </div>
          {cargandoInsumos ? (
            <p className="text-center py-4 text-muted">Cargando insumos...</p>
          ) : (
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-theme">
                <tr>
                  <th>Nombre del insumo</th>
                  <th>Unidad</th>
                  <th className="text-center pe-4" style={{ width: '130px' }}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {insumosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      No hay insumos disponibles.
                    </td>
                  </tr>
                ) : (
                  insumosFiltrados.map((insumo) => {
                    const seleccionado = insumosSeleccionados.some(
                      (item) => item.insumo.id === insumo.id,
                    );
                    return (
                      <tr key={`modal-${insumo.id}`}>
                        <td>{insumo.nombre}</td>
                        <td>{insumo.unidadMedidaObj.sufijo}</td>
                        <td className="text-center pe-4">
                          <Button
                            variant={seleccionado ? 'danger' : 'success'}
                            size="sm"
                            className="w-100"
                            onClick={() => alternarInsumo(insumo)}
                          >
                            {seleccionado ? (
                              <>
                                <i className="bi bi-x-circle me-1"></i> Quitar
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check2-circle me-1"></i> Agregar
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-body-tertiary">
          <Button variant="primary" onClick={() => setMostrarInsumos(false)}>
            Finalizar Selección
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={mostrarNuevoInsumo} onHide={() => setMostrarNuevoInsumo(false)} centered>
        <Modal.Header closeButton className="bg-body-tertiary">
          <Modal.Title className="text-secondary fs-5">Nuevo insumo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mostrarNuevoInsumo && (
            <InsumoForm
              onGuardar={crearInsumo}
              onCancelar={() => setMostrarNuevoInsumo(false)}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

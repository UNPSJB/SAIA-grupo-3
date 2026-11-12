import { Fragment, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  Button,
  Card,
  Form,
  InputGroup,
  Modal,
  Table,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FormErrors } from '../../shared/components/FormErrors';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { fechaHoyIso, formatearFecha } from '../../shared/libreria/fechas';
import { useAuth } from '../../shared/hooks/useAuth';
import { InsumoForm } from '../insumos/InsumoForm';
import { createInsumo } from '../insumos/InsumoApi';
import type { InsumoCreate } from '../insumos/types';
import { ProductoForm } from '../productos/ProductoForm';
import { createProducto, getProductosActivos } from '../productos/productoApi';
import type { Producto, ProductoCreate } from '../productos/types';
import { getInsumosDisponibles, getLotesDisponibles } from './loteProduccionApi';
import './LoteProduccionForm.css';
import type {
  InsumoSeleccionable,
  LoteProduccionCreate,
  LoteRecepcionDisponible,
  PrecargaLote,
} from './types';

interface LoteProduccionFormProps {
  onGuardar: (datos: LoteProduccionCreate) => Promise<void>;
  onCancelar: () => void;
  precarga?: PrecargaLote;
}

function seleccionDesdePrecarga(
  precarga: PrecargaLote | undefined,
  disponibles: InsumoSeleccionable[],
): InsumoSeleccionado[] {
  if (!precarga) return [];
  return precarga.insumos.flatMap(({ insumoId, cantidad }) => {
    const insumo = disponibles.find((opcion) => opcion.id === insumoId);
    return insumo
      ? [{ insumo, cantidadUsada: String(cantidad), lotesRecepcion: [{ loteId: '', cantidad: '' }] }]
      : [];
  });
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
  lotesRecepcion: { loteId: string; cantidad: string }[];
}

function calcularAsignacionAutomatica(
  cantidadUsada: string,
  opciones: LoteRecepcionDisponible[],
): { loteId: string; cantidad: string }[] {
  let restante = Number(cantidadUsada);
  if (!Number.isFinite(restante) || restante <= 0) return [];

  const asignaciones: { loteId: string; cantidad: string }[] = [];
  for (const lote of opciones) {
    if (restante <= 0) break;
    const disponible = lote.cantidad_disponible;
    if (!Number.isFinite(disponible) || disponible <= 0) continue;

    const cantidadAsignada = Math.min(restante, disponible);
    asignaciones.push({ loteId: String(lote.id), cantidad: String(cantidadAsignada) });
    restante = Math.max(0, restante - cantidadAsignada);
  }
  return asignaciones;
}

export function LoteProduccionForm({ onGuardar, onCancelar, precarga }: LoteProduccionFormProps) {
  const { currentUser } = useAuth();
  const esAdministrador = currentUser?.administrar === true;
  const hoy = fechaHoyIso();
  const form = useForm<ValoresLote>({
    defaultValues: {
      productoId: precarga ? String(precarga.productoId) : '',
      fechaProduccion: hoy,
      cantidad: precarga?.cantidad ? String(precarga.cantidad) : '',
      observaciones: '',
    },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);
  const [insumos, setInsumos] = useState<InsumoSeleccionable[]>([]);
  const [insumosSeleccionados, setInsumosSeleccionados] = useState<InsumoSeleccionado[]>([]);
  const [modoAsignacion, setModoAsignacion] = useState<'automatico' | 'manual'>('automatico');
  const [cargandoInsumos, setCargandoInsumos] = useState(true);
  const [errorInsumos, setErrorInsumos] = useState<string | null>(null);
  const [mostrarInsumos, setMostrarInsumos] = useState(false);
  const [mostrarNuevoInsumo, setMostrarNuevoInsumo] = useState(false);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [resultadoLotesDisponibles, setResultadoLotesDisponibles] = useState<{
    clave: string;
    lotes: Record<number, LoteRecepcionDisponible[]>;
    error: string | null;
  } | null>(null);

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
        if (!activo) return;
        setInsumos(datos);
        if (precarga) setInsumosSeleccionados(seleccionDesdePrecarga(precarga, datos));
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
  }, [precarga]);

  const productoId = useWatch({ control: form.control, name: 'productoId' });
  const cantidadProducida = useWatch({ control: form.control, name: 'cantidad' });
  const vinculadoAReceta = !!precarga && productoId === String(precarga.productoId);
  const cantidadDeReceta = new Map(
    (precarga?.insumos ?? []).map(({ insumoId, cantidad }) => [insumoId, cantidad]),
  );
  const insumosQuitados = precarga
    ? precarga.insumos.filter(
        ({ insumoId }) => !insumosSeleccionados.some(({ insumo }) => insumo.id === insumoId),
      ).length
    : 0;
  const cantidadDifiere =
    vinculadoAReceta &&
    precarga.cantidad !== null &&
    Number(cantidadProducida) !== precarga.cantidad;
  const fechaProduccion = useWatch({ control: form.control, name: 'fechaProduccion' });
  const productoElegido = productos.find((producto) => String(producto.id) === productoId);
  const idsInsumosSeleccionados = insumosSeleccionados
    .map(({ insumo }) => insumo.id)
    .join(',');
  const claveLotesDisponibles = `${fechaProduccion || hoy}:${idsInsumosSeleccionados}`;
  const lotesDisponiblesPorInsumo =
    resultadoLotesDisponibles?.clave === claveLotesDisponibles
      ? resultadoLotesDisponibles.lotes
      : {};
  const cargandoLotesDisponibles =
    idsInsumosSeleccionados !== '' &&
    resultadoLotesDisponibles?.clave !== claveLotesDisponibles;
  const errorLotesDisponibles =
    resultadoLotesDisponibles?.clave === claveLotesDisponibles
      ? resultadoLotesDisponibles.error
      : null;

  useEffect(() => {
    const ids = idsInsumosSeleccionados
      ? idsInsumosSeleccionados.split(',').map(Number)
      : [];
    if (ids.length === 0) return;

    let activo = true;
    Promise.all(
      ids.map(async (id) => ({
        id,
        lotes: await getLotesDisponibles(id, fechaProduccion || hoy),
      })),
    )
      .then((resultados) => {
        if (!activo) return;
        const lotesPorInsumo = Object.fromEntries(
          resultados.map(({ id, lotes }) => [id, lotes]),
        );
        setResultadoLotesDisponibles({
          clave: claveLotesDisponibles,
          lotes: lotesPorInsumo,
          error: null,
        });
        setInsumosSeleccionados((actuales) =>
          actuales.map((seleccionado) => {
            const opciones = lotesPorInsumo[seleccionado.insumo.id] ?? [];
            const opcionesIds = new Set(opciones.map((lote) => String(lote.id)));
            const asignacionesValidas = seleccionado.lotesRecepcion.filter(
              ({ loteId }) => opcionesIds.has(loteId),
            );
            return {
              ...seleccionado,
              lotesRecepcion:
                asignacionesValidas.length > 0
                  ? asignacionesValidas
                  : [{ loteId: '', cantidad: '' }],
            };
          }),
        );
      })
      .catch((err: unknown) => {
        if (activo)
          setResultadoLotesDisponibles({
            clave: claveLotesDisponibles,
            lotes: {},
            error:
              err instanceof Error
                ? err.message
                : 'No se pudieron cargar las recepciones disponibles.',
          });
      });

    return () => {
      activo = false;
    };
  }, [fechaProduccion, hoy, idsInsumosSeleccionados, claveLotesDisponibles]);

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
        : [
            ...actuales,
            {
              insumo,
              cantidadUsada: '',
              lotesRecepcion: [{ loteId: '', cantidad: '' }],
            },
          ],
    );
  };

  const alternarInsumo = (insumo: InsumoSeleccionable) => {
    setInsumosSeleccionados((actuales) =>
      actuales.some((seleccionado) => seleccionado.insumo.id === insumo.id)
        ? actuales.filter((seleccionado) => seleccionado.insumo.id !== insumo.id)
        : [
            ...actuales,
            {
              insumo,
              cantidadUsada: '',
              lotesRecepcion: [{ loteId: '', cantidad: '' }],
            },
          ],
    );
  };

  const crearInsumo = async (datos: InsumoCreate) => {
    const nuevo = await createInsumo(datos);
    if (!nuevo.unidadMedidaObj)
      throw new Error('El insumo se creó, pero no se recibió su unidad de medida.');
    const insumoDisponible: InsumoSeleccionable = {
      id: nuevo.id,
      nombre: nuevo.nombre,
      cantidad: nuevo.cantidad,
      unidadMedidaObj: nuevo.unidadMedidaObj,
    };
    setInsumos((actuales) =>
      [...actuales, insumoDisponible].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    agregarInsumo(insumoDisponible);
    setMostrarNuevoInsumo(false);
  };

  const agregarLoteRecepcion = (insumoId: number) => {
    const opciones = lotesDisponiblesPorInsumo[insumoId] ?? [];
    setInsumosSeleccionados((actuales) =>
      actuales.map((seleccionado) => {
        if (seleccionado.insumo.id !== insumoId) return seleccionado;
        if (seleccionado.lotesRecepcion.length >= opciones.length) return seleccionado;
        return {
          ...seleccionado,
          lotesRecepcion: [
            ...seleccionado.lotesRecepcion,
            { loteId: '', cantidad: '' },
          ],
        };
      }),
    );
  };

  const actualizarAsignacion = (
    insumoId: number,
    indice: number,
    cambios: Partial<{ loteId: string; cantidad: string }>,
  ) => {
    setInsumosSeleccionados((actuales) =>
      actuales.map((seleccionado) =>
        seleccionado.insumo.id === insumoId
          ? {
              ...seleccionado,
              lotesRecepcion: seleccionado.lotesRecepcion.map((asignacion, indiceActual) =>
                indiceActual === indice ? { ...asignacion, ...cambios } : asignacion,
              ),
            }
          : seleccionado,
      ),
    );
  };

  const enviar = form.handleSubmit(async (valores) => {
    const hayCantidadInvalida = insumosSeleccionados.some(
      ({ cantidadUsada }) => !Number.isFinite(Number(cantidadUsada)) || Number(cantidadUsada) <= 0,
    );
    if (hayCantidadInvalida) {
      form.setError('root', { message: 'Indicá una cantidad mayor a cero para cada insumo.' });
      return;
    }
    const insumosConAsignaciones = insumosSeleccionados.map((seleccionado) => ({
      ...seleccionado,
      asignaciones:
        modoAsignacion === 'automatico'
          ? calcularAsignacionAutomatica(
              seleccionado.cantidadUsada,
              lotesDisponiblesPorInsumo[seleccionado.insumo.id] ?? [],
            )
          : seleccionado.lotesRecepcion,
    }));
    const asignacionInvalida = insumosConAsignaciones.find((seleccionado) => {
      const { cantidadUsada } = seleccionado;
      const cantidadEsperada = Number(cantidadUsada);
      const { asignaciones } = seleccionado;
      const cantidadAsignada = asignaciones.reduce(
        (total, asignacion) => total + Number(asignacion.cantidad || 0),
        0,
      );
      return (
        cargandoLotesDisponibles ||
        asignaciones.length === 0 ||
        asignaciones.some((asignacion) => {
          const lote = lotesDisponiblesPorInsumo[seleccionado.insumo.id]?.find(
            (opcion) => String(opcion.id) === asignacion.loteId,
          );
          const cantidad = Number(asignacion.cantidad);
          return (
            !lote ||
            !Number.isFinite(cantidad) ||
            cantidad <= 0 ||
            cantidad > lote.cantidad_disponible
          );
        }) ||
        Math.abs(cantidadAsignada - cantidadEsperada) > 1e-9
      );
    });
    if (asignacionInvalida) {
      form.setError('root', {
        message:
          modoAsignacion === 'automatico'
            ? 'El stock de las recepciones utilizables no alcanza para cubrir la cantidad indicada. Reducí la cantidad o ingresá una recepción válida.'
            : 'Revisá la distribución por recepciones: las cantidades deben coincidir con lo usado y no superar el saldo de cada lote.',
      });
      return;
    }
    form.clearErrors('root');
    try {
      await onGuardar({
        producto_id: Number(valores.productoId),
        fecha_produccion: valores.fechaProduccion,
        cantidad: Number(valores.cantidad),
        observaciones: valores.observaciones.trim() || null,
        version_receta_id: vinculadoAReceta ? precarga.versionId : null,
        factor_receta: vinculadoAReceta ? precarga.factor : null,
        insumos: insumosConAsignaciones.map(({ insumo, cantidadUsada, asignaciones }) => ({
          insumo_id: insumo.id,
          cantidad_usada: Number(cantidadUsada),
          lotes_recepcion: asignaciones.map((asignacion) => ({
            lote_recepcion_id: Number(asignacion.loteId),
            cantidad: Number(asignacion.cantidad),
          })),
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
      <Card
        className="shadow-sm border-0 mx-auto"
        style={{ width: 'min(90vw, 100%)', maxWidth: '1400px' }}
      >
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          Registrar Lote de Producción
        </Card.Header>
        <Card.Body className="p-4">
          <Form noValidate onSubmit={enviar}>
            <FormErrors key={submitCount} errors={errors} />
            {precarga && (
              <Alert variant={vinculadoAReceta ? 'info' : 'warning'} className="py-2">
                {vinculadoAReceta ? (
                  <>
                    <i className="bi bi-journal-bookmark me-2" aria-hidden="true" />
                    Lote iniciado desde la receta de <strong>{precarga.productoNombre}</strong>,
                    versión {precarga.versionNumero} (factor ×
                    {precarga.factor.toLocaleString('es-AR', { maximumFractionDigits: 3 })}). Las
                    cantidades son editables; se marcan las que difieren de la receta.
                  </>
                ) : (
                  <>
                    Cambiaste el producto: este lote ya no quedará vinculado a la receta de{' '}
                    {precarga.productoNombre}.
                  </>
                )}
                {precarga.sinPrecargar.length > 0 && (
                  <div className="small mt-1">
                    No se precargaron: {precarga.sinPrecargar.join(', ')}. Agregalos a mano si los
                    usás.
                  </div>
                )}
                {insumosQuitados > 0 && (
                  <div className="small mt-1">
                    Quitaste {insumosQuitados} insumo{insumosQuitados > 1 ? 's' : ''} de la receta.
                  </div>
                )}
              </Alert>
            )}
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
                {cantidadDifiere && (
                  <Form.Text className="text-warning-emphasis">
                    <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                    Difiere de la receta escalada ({precarga.cantidad?.toLocaleString('es-AR')}).
                  </Form.Text>
                )}
              </Form.Group>
            </div>
            <Form.Group className="mb-4">
              <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-2 mb-2 mt-5">
                <div className="d-flex flex-column flex-md-row align-items-md-center gap-2">
                  <Form.Label className="mb-0 pe-3 fw-bold">Insumos utilizados</Form.Label>
                  <ToggleButtonGroup
                    type="radio"
                    name="modo-asignacion-insumos"
                    value={modoAsignacion}
                    size="sm"
                    aria-label="Modo de asignación de recepciones"
                    onChange={(modo: 'automatico' | 'manual') => {
                      setModoAsignacion(modo);
                      form.clearErrors('root');
                    }}
                  >
                    <ToggleButton
                      id="modo-asignacion-automatico"
                      value="automatico"
                      variant="outline-primary"
                    >
                      Automático por vencimiento
                    </ToggleButton>
                    <ToggleButton
                      id="modo-asignacion-manual"
                      value="manual"
                      variant="outline-primary"
                    >
                      Manual por lotes
                    </ToggleButton>
                  </ToggleButtonGroup>
                </div>
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
              {errorLotesDisponibles && <ErrorAlert mensaje={errorLotesDisponibles} />}
              <p className="small text-body-secondary my-4">
                {modoAsignacion === 'automatico'
                  ? 'Las cantidades se asignan automáticamente a los lotes de insumos con vencimiento más próximo. Revisá qué lotes se utilizarán; si el saldo no alcanza, reducí la cantidad o ingresá un lote válido.'
                  : 'Elegí los lotes de insumos que vas a utilizar. Se ordenan por vencimiento; podés elegir otro lote vigente. Si uno no alcanza, agregá otro y distribuí manualmente la cantidad.'}
              </p>
              {insumosSeleccionados.length === 0 ? (
                <p className="text-muted small mb-0">Todavía no agregaste insumos al lote.</p>
              ) : (
                <div className="border rounded bg-body">
                  <Table
                    responsive
                    size="sm"
                    striped
                    hover
                    className="mb-0 align-middle lotes-produccion-insumos-table"
                  >
                    <thead className="table-theme">
                      <tr>
                        <th className='text-start p-3'>Insumo</th>
                        <th className="text-center lotes-produccion-col-cantidad-total">
                          Cantidad usada
                          <br />
                          total
                        </th>
                        <th className="text-center">
                          {modoAsignacion === 'automatico'
                            ? 'Lotes de insumos'
                            : 'Proveedor, lote y vencimiento'}
                        </th>
                        {modoAsignacion === 'manual' && (
                          <th className="text-end pe-4 lotes-produccion-col-cantidad-proveedor">
                            Cantidad por
                            <br />
                            proveedor
                          </th>
                        )}
                        <th className="text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insumosSeleccionados.map((seleccionado) => {
                        const { insumo, cantidadUsada, lotesRecepcion } = seleccionado;
                        const opciones = lotesDisponiblesPorInsumo[insumo.id] ?? [];
                        const asignacionesEfectivas =
                          modoAsignacion === 'automatico'
                            ? calcularAsignacionAutomatica(cantidadUsada, opciones)
                            : lotesRecepcion;
                        const cantidadObjetivo = Number(cantidadUsada);
                        const cantidadAsignada = asignacionesEfectivas.reduce(
                          (total, asignacion) => total + Number(asignacion.cantidad || 0),
                          0,
                        );
                        const superaSaldoSeleccionado = asignacionesEfectivas.some((asignacion) => {
                          const lote = opciones.find(
                            (opcion) => String(opcion.id) === asignacion.loteId,
                          );
                          return lote && Number(asignacion.cantidad) > lote.cantidad_disponible;
                        });
                        const puedeAgregarRecepcion =
                          modoAsignacion === 'manual' &&
                          Number.isFinite(cantidadObjetivo) &&
                          (cantidadObjetivo > cantidadAsignada + 1e-9 ||
                            superaSaldoSeleccionado) &&
                          opciones.length > asignacionesEfectivas.length;
                        const filasRecepcion = asignacionesEfectivas.map((asignacion, indice) => {
                          const loteElegido = opciones.find(
                            (lote) => String(lote.id) === asignacion.loteId,
                          );
                          const idsDeOtrasFilas = new Set(
                            asignacionesEfectivas
                              .filter((_, indiceActual) => indiceActual !== indice)
                              .map(({ loteId }) => loteId),
                          );
                          const opcionesFila = opciones.filter(
                            (lote) =>
                              !idsDeOtrasFilas.has(String(lote.id)) ||
                              String(lote.id) === asignacion.loteId,
                          );
                          const cantidadAsignadaAlLote = Number(asignacion.cantidad);
                          const cantidadInvalida =
                            !Number.isFinite(cantidadAsignadaAlLote) ||
                            cantidadAsignadaAlLote <= 0 ||
                            (!!loteElegido &&
                              cantidadAsignadaAlLote > loteElegido.cantidad_disponible);
                          return { asignacion, indice, loteElegido, opcionesFila, cantidadInvalida };
                        });

                        return (
                          <Fragment key={insumo.id}>
                          <tr>
                            <td className="ps-3">
                              <div>{insumo.nombre}</div>
                              <small className="text-muted">
                                Stock total: {insumo.cantidad.toLocaleString('es-AR')}{' '}
                                {insumo.unidadMedidaObj.sufijo}
                              </small>
                            </td>
                            <td className="lotes-produccion-col-cantidad-total">
                              <InputGroup size="sm" className="mx-auto" style={{ maxWidth: '135px' }}>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={cantidadUsada}
                                  aria-label={`Cantidad utilizada total de ${insumo.nombre}`}
                                  onChange={(evento) => {
                                    const valor = evento.target.value;
                                    setInsumosSeleccionados((actuales) =>
                                      actuales.map((actual) =>
                                        actual.insumo.id === insumo.id
                                          ? { ...actual, cantidadUsada: valor }
                                          : actual,
                                      ),
                                    );
                                  }}
                                />
                                <InputGroup.Text>{insumo.unidadMedidaObj.sufijo}</InputGroup.Text>
                              </InputGroup>
                              {vinculadoAReceta && !cantidadDeReceta.has(insumo.id) && (
                                <small className="d-block text-center text-warning-emphasis mt-1">
                                  No está en la receta
                                </small>
                              )}
                              {vinculadoAReceta &&
                                cantidadDeReceta.has(insumo.id) &&
                                Number(cantidadUsada) !== cantidadDeReceta.get(insumo.id) && (
                                  <small className="d-block text-center text-warning-emphasis mt-1">
                                    Difiere de la receta (
                                    {cantidadDeReceta.get(insumo.id)?.toLocaleString('es-AR')})
                                  </small>
                                )}
                            </td>
                            <td className="lotes-produccion-col-recepciones">
                              {cargandoLotesDisponibles ? (
                                <small className="text-muted">Cargando recepciones...</small>
                              ) : modoAsignacion === 'automatico' ? (
                                filasRecepcion.length > 0 ? (
                                  <div className="d-flex flex-column gap-1">
                                    {filasRecepcion.map(({ asignacion, indice, loteElegido }) => (
                                      <div
                                        key={`${insumo.id}-auto-${indice}`}
                                        className="d-flex flex-column flex-md-row justify-content-between gap-1"
                                      >
                                        <span>
                                          {loteElegido
                                            ? `${loteElegido.proveedor_nombre} · ${loteElegido.numero_lote} · vence ${formatearFecha(loteElegido.fecha_vencimiento)}${loteElegido.es_vencimiento_proximo ? ' · Vencimiento próximo' : ''}`
                                            : 'Recepción no disponible'}
                                        </span>
                                        <span className="text-nowrap fw-semibold">
                                          {Number(asignacion.cantidad).toLocaleString('es-AR')}{' '}
                                          {insumo.unidadMedidaObj.sufijo}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <small className="text-muted">
                                    {Number.isFinite(cantidadObjetivo) && cantidadObjetivo > 0
                                      ? 'No hay recepciones utilizables para esta fecha de producción.'
                                      : 'Ingresá la cantidad usada para calcular las recepciones.'}
                                  </small>
                                )
                              ) : opciones.length === 0 ? (
                                <small className="text-danger">
                                  No hay recepciones utilizables para esta fecha de producción.
                                </small>
                              ) : (
                                <>
                                  <div className="d-flex flex-column gap-2">
                                    {filasRecepcion.map(
                                      ({ asignacion, indice, loteElegido, opcionesFila }) => (
                                        <div
                                          key={`${insumo.id}-${indice}`}
                                          className="flex-grow-1 lotes-produccion-col-recepcion"
                                        >
                                          <Form.Select
                                            size="sm"
                                            value={asignacion.loteId}
                                            isInvalid={submitCount > 0 && !loteElegido}
                                            aria-label={`Recepción de ${insumo.nombre}, opción ${indice + 1}`}
                                            onChange={(evento) =>
                                              actualizarAsignacion(insumo.id, indice, {
                                                loteId: evento.target.value,
                                                cantidad: '',
                                              })
                                            }
                                          >
                                            <option value="">Seleccioná proveedor y lote...</option>
                                            {opcionesFila.map((lote) => (
                                              <option key={lote.id} value={lote.id}>
                                                {lote.proveedor_nombre} · {lote.numero_lote} ·
                                                vence {formatearFecha(lote.fecha_vencimiento)} ·
                                                disponible{' '}
                                                {lote.cantidad_disponible.toLocaleString('es-AR')}
                                                {lote.es_vencimiento_proximo ? ' · Vencimiento próximo' : ''}
                                              </option>
                                            ))}
                                          </Form.Select>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                            {modoAsignacion === 'manual' && (
                              <td className="lotes-produccion-col-cantidad-proveedor">
                                {!cargandoLotesDisponibles && opciones.length > 0 && (
                                  <div className="d-flex flex-column gap-2">
                                    {filasRecepcion.map(
                                      ({ asignacion, indice, cantidadInvalida }) => (
                                        <div
                                          key={`${insumo.id}-cantidad-${indice}`}
                                          className="d-flex align-items-center justify-content-end gap-2"
                                        >
                                          <InputGroup
                                            size="sm"
                                            style={{ maxWidth: '125px', minWidth: '0' }}
                                          >
                                            <Form.Control
                                              type="number"
                                              min="0"
                                              step="any"
                                              value={asignacion.cantidad}
                                              isInvalid={submitCount > 0 && cantidadInvalida}
                                              aria-label={`Cantidad de ${insumo.nombre} desde la recepción ${indice + 1}`}
                                              onChange={(evento) =>
                                                actualizarAsignacion(insumo.id, indice, {
                                                  cantidad: evento.target.value,
                                                })
                                              }
                                            />
                                            <InputGroup.Text>
                                              {insumo.unidadMedidaObj.sufijo}
                                            </InputGroup.Text>
                                          </InputGroup>
                                          {lotesRecepcion.length > 1 && (
                                            <Button
                                              variant="outline-danger"
                                              size="sm"
                                              aria-label={`Quitar recepción ${indice + 1} de ${insumo.nombre}`}
                                              onClick={() =>
                                                setInsumosSeleccionados((actuales) =>
                                                  actuales.map((actual) =>
                                                    actual.insumo.id === insumo.id
                                                      ? {
                                                          ...actual,
                                                          lotesRecepcion:
                                                            actual.lotesRecepcion.filter(
                                                              (_, indiceActual) =>
                                                                indiceActual !== indice,
                                                            ),
                                                        }
                                                      : actual,
                                                  ),
                                                )
                                              }
                                            >
                                              <i className="bi bi-x-circle"></i>
                                            </Button>
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="text-center" style={{ width: '80px' }}>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                aria-label={`Quitar ${insumo.nombre}`}
                                onClick={() =>
                                  setInsumosSeleccionados((actuales) =>
                                    actuales.filter(
                                      (actual) => actual.insumo.id !== insumo.id,
                                    ),
                                  )
                                }
                              >
                                <i className="bi bi-x-circle"></i>
                              </Button>
                            </td>
                          </tr>
                          {!cargandoLotesDisponibles &&
                            (modoAsignacion === 'manual'
                              ? opciones.length > 0
                              : Number.isFinite(cantidadObjetivo) && cantidadObjetivo > 0) && (
                            <tr className="lotes-produccion-insumos-detalle">
                              <td colSpan={modoAsignacion === 'manual' ? 5 : 4}>
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                                  {modoAsignacion === 'manual' && (
                                    <div className="d-flex flex-column">
                                      {filasRecepcion.map(({ indice, loteElegido }) =>
                                        loteElegido ? (
                                          <small
                                            key={`${insumo.id}-disponible-${indice}`}
                                            className="text-body-secondary"
                                          >
                                            Recepción {indice + 1}: disponible{' '}
                                            {loteElegido.cantidad_disponible.toLocaleString(
                                              'es-AR',
                                            )}{' '}
                                            {insumo.unidadMedidaObj.sufijo}
                                            {loteElegido.es_vencimiento_proximo ? ' · Vencimiento próximo' : ''}
                                          </small>
                                        ) : null,
                                      )}
                                    </div>
                                  )}
                                  <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-2">
                                    {puedeAgregarRecepcion && (
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => agregarLoteRecepcion(insumo.id)}
                                      >
                                        <i className="bi bi-plus-lg"></i> Agregar otra recepción
                                      </Button>
                                    )}
                                    <small
                                      className={
                                        Math.abs(cantidadAsignada - cantidadObjetivo) <= 1e-9
                                          ? 'text-success'
                                          : 'text-danger'
                                      }
                                    >
                                      {modoAsignacion === 'automatico'
                                        ? 'Asignado automáticamente: '
                                        : 'Asignado: '}
                                      {cantidadAsignada.toLocaleString('es-AR')} de{' '}
                                      {Number.isFinite(cantidadObjetivo)
                                        ? cantidadObjetivo.toLocaleString('es-AR')
                                        : '0'}{' '}
                                      {insumo.unidadMedidaObj.sufijo}
                                      {modoAsignacion === 'automatico' &&
                                        cantidadAsignada + 1e-9 < cantidadObjetivo &&
                                        ` · Falta ${Math.max(0, cantidadObjetivo - cantidadAsignada).toLocaleString('es-AR')} ${insumo.unidadMedidaObj.sufijo}`}
                                    </small>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            )}
                          </Fragment>
                        );
                      })}
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

      <Modal
        show={mostrarInsumos}
        onHide={() => setMostrarInsumos(false)}
        dialogClassName="lotes-produccion-insumos-modal"
      >
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
                  <th>Stock disponible</th>
                  <th>Unidad</th>
                  <th className="text-center pe-4" style={{ width: '130px' }}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {insumosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted">
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
                        <td>{insumo.cantidad.toLocaleString('es-AR')}</td>
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

import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { loadAllPages } from '../../shared/libreria/options';
import type { InsumoQuimicoCreate } from '../insumosQuimicos/types';
import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Modal, Table, InputGroup } from 'react-bootstrap';
import type { Tarea, TareaCreate, FrecuenciaTarea } from './types';
import { FRECUENCIAS_TAREA } from './types';
import { getEquipos, type Equipo } from '../equipos';
import { getElementos, type Elemento, ElementoForm, createElemento } from '../elementos';
import {
  getInsumosQuimicos,
  type InsumoQuimico,
  InsumoQuimicoForm,
  createInsumoQuimico,
} from '../insumosQuimicos';

interface TareaFormProps {
  tareaInicial?: Tarea | null;
  equipoIdFijo?: number | null;
  onGuardar: (datos: TareaCreate) => Promise<void>;
  onCancelar: () => void;
}

export function TareaForm({ tareaInicial, equipoIdFijo, onGuardar, onCancelar }: TareaFormProps) {
  const form = useForm<{
    nombre: string;
    frecuencia: FrecuenciaTarea;
    equipoId: number | '';
    procedimiento: string;
  }>({ defaultValues: { nombre: '', frecuencia: 'diaria', equipoId: '', procedimiento: '' } });
  const enviando = form.formState.isSubmitting;
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
      maxLength: { value: 150, message: 'Texto demasiado largo.' },
    },
  });
  const {
    field: {
      value: frecuencia,
      onChange: setFrecuencia,
      onBlur: frecuenciaBlur,
      ref: frecuenciaRef,
      name: frecuenciaName,
    },
  } = useController({
    name: 'frecuencia',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });
  const {
    field: {
      value: equipoId,
      onChange: setEquipoId,
      onBlur: equipoIdBlur,
      ref: equipoIdRef,
      name: equipoIdName,
    },
  } = useController({ name: 'equipoId', control: form.control, rules: {} });
  const {
    field: {
      value: procedimiento,
      onChange: setProcedimiento,
      onBlur: procedimientoBlur,
      ref: procedimientoRef,
      name: procedimientoName,
    },
  } = useController({
    name: 'procedimiento',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      maxLength: { value: 2000, message: 'Texto demasiado largo.' },
    },
  });

  const [elementosSeleccionados, setElementosSeleccionados] = useState<number[]>(
    tareaInicial?.elementos?.map((e) => e.id as number) ?? [],
  );
  const [insumosSeleccionados, setInsumosSeleccionados] = useState<
    { insumo_quimico_id: number; cantidad: number }[]
  >(
    tareaInicial?.insumos_quimicos?.map((i) => ({
      insumo_quimico_id: i.insumo_quimico_id,
      cantidad: i.cantidad,
    })) ?? [],
  );

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [insumos, setInsumos] = useState<InsumoQuimico[]>([]);
  const [cargandoDependencias, setCargandoDependencias] = useState(true);

  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const [buscarElemento, setBuscarElemento] = useState('');
  const [buscarInsumo, setBuscarInsumo] = useState('');
  const [mostrarModalElementos, setMostrarModalElementos] = useState(false);
  const [mostrarModalNuevoElemento, setMostrarModalNuevoElemento] = useState(false);
  const [mostrarModalInsumos, setMostrarModalInsumos] = useState(false);
  const [mostrarModalNuevoInsumo, setMostrarModalNuevoInsumo] = useState(false);

  useEffect(() => {
    Promise.all([
      loadAllPages((page) => getEquipos(page, 100)),
      loadAllPages((page) => getElementos(page, 100)),
      loadAllPages((page) => getInsumosQuimicos(page, 100)),
    ])
      .then(([resEquipos, resElementos, resInsumos]) => {
        setEquipos(resEquipos.items);
        setElementos(resElementos.items);
        setInsumos(resInsumos.items);
      })
      .catch(() => setErrorValidacion('Error al cargar dependencias.'))
      .finally(() => setCargandoDependencias(false));
  }, []);

  useEffect(() => {
    if (tareaInicial) {
      setNombre(tareaInicial.nombre);
      setFrecuencia(tareaInicial.frecuencia);
      setEquipoId(tareaInicial.equipo_id || '');
      setProcedimiento(tareaInicial.procedimiento);
    }
  }, [tareaInicial, setNombre, setFrecuencia, setEquipoId, setProcedimiento]);

  useEffect(() => {
    if (equipoIdFijo) setEquipoId(equipoIdFijo);
  }, [equipoIdFijo, setEquipoId]);

  const handleElementoToggle = (id: number) => {
    setElementosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const handleInsumoToggle = (id: number) => {
    setInsumosSeleccionados((prev) => {
      if (prev.find((i) => i.insumo_quimico_id === id))
        return prev.filter((i) => i.insumo_quimico_id !== id);
      return [...prev, { insumo_quimico_id: id, cantidad: 0 }];
    });
  };

  const handleCantidadInsumoChange = (id: number, cantidad: number) => {
    setInsumosSeleccionados((prev) =>
      prev.map((item) => (item.insumo_quimico_id === id ? { ...item, cantidad } : item)),
    );
  };

  const handleGuardarNuevoElemento = async (datos: Elemento) => {
    try {
      const creado = await createElemento(datos);
      setElementos([...elementos, creado]);
      setElementosSeleccionados([...elementosSeleccionados, creado.id as number]);
      setMostrarModalNuevoElemento(false);
    } catch (err: unknown) {
      form.setError('root', { message: err instanceof Error ? err.message : 'Error' });
    }
  };

  const handleGuardarNuevoInsumo = async (datos: InsumoQuimicoCreate) => {
    try {
      const creado = await createInsumoQuimico(datos);
      setInsumos([...insumos, creado]);
      setInsumosSeleccionados([
        ...insumosSeleccionados,
        { insumo_quimico_id: creado.id, cantidad: 0 },
      ]);
      setMostrarModalNuevoInsumo(false);
    } catch (err: unknown) {
      form.setError('root', { message: err instanceof Error ? err.message : 'Error' });
    }
  };

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    setErrorValidacion(null);
    if (!nombre.trim() || !procedimiento.trim()) return;

    const invalidInsumo = insumosSeleccionados.find((i) => i.cantidad <= 0);
    if (invalidInsumo) {
      setErrorValidacion('Todos los insumos seleccionados deben tener una cantidad mayor a 0.');
      return;
    }

    try {
      await onGuardar({
        nombre: nombre.trim(),
        frecuencia,
        procedimiento: procedimiento.trim(),
        equipo_id: equipoId ? Number(equipoId) : null,
        elemento_ids: elementosSeleccionados,
        insumos_quimicos: insumosSeleccionados,
      });
    } catch (err: unknown) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al guardar los datos.');
    }
  });

  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
        <Card.Header as="h5" className="bg-light text-secondary py-3">
          {tareaInicial ? `Modificar Tarea #${tareaInicial?.id}` : 'Registrar Nueva Tarea'}
        </Card.Header>
        <Card.Body className="p-4">
          {errorValidacion && <Alert variant="danger">{errorValidacion}</Alert>}

          <Form noValidate onSubmit={handleSubmit}>
            <FormErrors errors={form.formState.errors} />
            <div className="row">
              <Form.Group controlId="TareaForm-nombre" className="col-md-8 mb-3">
                <Form.Label>Nombre de la Tarea</Form.Label>
                <Form.Control
                  type="text"
                  required
                  maxLength={150}
                  ref={nombreRef}
                  onBlur={nombreBlur}
                  name={nombreName}
                  value={nombre}
                  isInvalid={!!form.formState.errors.nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </Form.Group>
              <Form.Group controlId="TareaForm-frecuencia" className="col-md-4 mb-3">
                <Form.Label>Frecuencia</Form.Label>
                <SearchableSelect
                  required
                  ref={frecuenciaRef}
                  onBlur={frecuenciaBlur}
                  name={frecuenciaName}
                  value={frecuencia}
                  isInvalid={!!form.formState.errors.frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value as FrecuenciaTarea)}
                >
                  {FRECUENCIAS_TAREA.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </SearchableSelect>
              </Form.Group>
            </div>

            <Form.Group controlId="TareaForm-equipoId" className="mb-4">
              <Form.Label>Equipo Asignado {equipoIdFijo ? '' : '(Opcional)'}</Form.Label>
              <SearchableSelect
                disabled={cargandoDependencias || Boolean(equipoIdFijo)}
                ref={equipoIdRef}
                onBlur={equipoIdBlur}
                name={equipoIdName}
                value={equipoId}
                isInvalid={!!form.formState.errors.equipoId}
                onChange={(e) => setEquipoId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Ninguno / No aplica...</option>
                {equipos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} ({e.numero_serie})
                  </option>
                ))}
              </SearchableSelect>
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Elementos de Limpieza</Form.Label>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setMostrarModalElementos(true)}
                  >
                    <i className="bi bi-card-list"></i> Agregar
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => setMostrarModalNuevoElemento(true)}
                  >
                    <i className="bi bi-plus-lg"></i> Nuevo
                  </Button>
                </div>
              </div>
              <div className="border rounded bg-white">
                {elementosSeleccionados.length === 0 ? (
                  <div className="text-muted p-3 small text-center">
                    No hay elementos seleccionados.
                  </div>
                ) : (
                  <Table size="sm" striped hover className="mb-0 align-middle">
                    <tbody>
                      {elementosSeleccionados.map((id) => {
                        const el = elementos.find((x) => x.id === id);
                        if (!el) return null;
                        return (
                          <tr key={id}>
                            <td className="ps-3 py-2">{el.nombre}</td>
                            <td className="text-end pe-3 py-2" style={{ width: '80px' }}>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleElementoToggle(id)}
                              >
                                <i className="bi bi-x-circle"></i>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Insumos Químicos Utilizados</Form.Label>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setMostrarModalInsumos(true)}
                  >
                    <i className="bi bi-card-list"></i> Agregar
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => setMostrarModalNuevoInsumo(true)}
                  >
                    <i className="bi bi-plus-lg"></i> Nuevo
                  </Button>
                </div>
              </div>
              <div className="border rounded bg-white">
                {insumosSeleccionados.length === 0 ? (
                  <div className="text-muted p-3 small text-center">
                    No hay insumos químicos seleccionados.
                  </div>
                ) : (
                  <Table size="sm" striped hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Insumo</th>
                        <th style={{ width: '200px' }}>Cantidad Fija</th>
                        <th className="text-end pe-3" style={{ width: '80px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {insumosSeleccionados.map((item) => {
                        const ins = insumos.find((x) => x.id === item.insumo_quimico_id);
                        if (!ins) return null;
                        return (
                          <tr key={item.insumo_quimico_id}>
                            <td className="ps-3 py-2">{ins.nombre}</td>
                            <td className="py-2">
                              <InputGroup size="sm">
                                <Form.Control
                                  type="number"
                                  step="any"
                                  min="0"
                                  required
                                  value={item.cantidad || ''}
                                  onChange={(e) =>
                                    handleCantidadInsumoChange(
                                      item.insumo_quimico_id,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                                <InputGroup.Text>
                                  {ins.unidadMedidaObj?.sufijo || 'u'}
                                </InputGroup.Text>
                              </InputGroup>
                            </td>
                            <td className="text-end pe-3 py-2">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleInsumoToggle(item.insumo_quimico_id)}
                              >
                                <i className="bi bi-x-circle"></i>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </div>
            </Form.Group>

            <Form.Group controlId="TareaForm-procedimiento" className="mb-4">
              <Form.Label>Procedimiento</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                required
                maxLength={2000}
                ref={procedimientoRef}
                onBlur={procedimientoBlur}
                name={procedimientoName}
                value={procedimiento}
                isInvalid={!!form.formState.errors.procedimiento}
                onChange={(e) => setProcedimiento(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={enviando}>
                {enviando ? 'Guardando...' : tareaInicial ? 'Actualizar Cambios' : 'Guardar Tarea'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* MODALES DE SELECCIÓN */}
      <Modal show={mostrarModalElementos} onHide={() => setMostrarModalElementos(false)} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="text-secondary fs-5">Seleccionar Elementos</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="p-3">
            <Form.Control
              type="search"
              aria-label="Buscar elementos"
              placeholder="Buscar elementos..."
              value={buscarElemento}
              onChange={(event) => setBuscarElemento(event.target.value)}
            />
          </div>
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Nombre</th>
                <th className="text-center pe-4" style={{ width: '130px' }}>
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {elementos
                .filter((el) =>
                  el.nombre.toLocaleLowerCase().includes(buscarElemento.toLocaleLowerCase()),
                )
                .map((el) => {
                  const sel = el.id && elementosSeleccionados.includes(el.id);
                  return (
                    <tr key={el.id}>
                      <td className="ps-4">{el.nombre}</td>
                      <td className="text-center pe-4">
                        <Button
                          variant={sel ? 'danger' : 'success'}
                          size="sm"
                          className="w-100"
                          onClick={() => el.id && handleElementoToggle(el.id)}
                        >
                          {sel ? (
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
                })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={mostrarModalInsumos} onHide={() => setMostrarModalInsumos(false)} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="text-secondary fs-5">Seleccionar Insumos Químicos</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="p-3">
            <Form.Control
              type="search"
              aria-label="Buscar insumos químicos"
              placeholder="Buscar insumos..."
              value={buscarInsumo}
              onChange={(event) => setBuscarInsumo(event.target.value)}
            />
          </div>
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Nombre</th>
                <th>Tipo</th>
                <th className="text-center pe-4" style={{ width: '130px' }}>
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {insumos
                .filter((ins) =>
                  ins.nombre.toLocaleLowerCase().includes(buscarInsumo.toLocaleLowerCase()),
                )
                .map((ins) => {
                  const sel = insumosSeleccionados.some((i) => i.insumo_quimico_id === ins.id);
                  return (
                    <tr key={ins.id}>
                      <td className="ps-4">{ins.nombre}</td>
                      <td className="text-capitalize">{ins.tipo_quimico}</td>
                      <td className="text-center pe-4">
                        <Button
                          variant={sel ? 'danger' : 'success'}
                          size="sm"
                          className="w-100"
                          onClick={() => ins.id && handleInsumoToggle(ins.id)}
                        >
                          {sel ? (
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
                })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* MODALES DE CREACIÓN RÁPIDA */}
      <Modal
        show={mostrarModalNuevoElemento}
        onHide={() => setMostrarModalNuevoElemento(false)}
        size="lg"
      >
        <Modal.Body className="bg-light p-0">
          <ElementoForm
            onGuardar={handleGuardarNuevoElemento}
            onCancelar={() => setMostrarModalNuevoElemento(false)}
          />
        </Modal.Body>
      </Modal>

      <Modal
        show={mostrarModalNuevoInsumo}
        onHide={() => setMostrarModalNuevoInsumo(false)}
        size="lg"
      >
        <Modal.Body className="bg-light p-0">
          <InsumoQuimicoForm
            onGuardar={handleGuardarNuevoInsumo}
            onCancelar={() => setMostrarModalNuevoInsumo(false)}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}

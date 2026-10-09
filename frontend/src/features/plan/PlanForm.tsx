import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { loadAllPages } from '../../shared/libreria/options';
import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Modal, Table, Badge } from 'react-bootstrap';
import type { PlanCreate, Plan } from './types';
import { getPersonal, type Personal } from '../personal';
import { getSectores, type Sector } from '../sectores';
import { getEquipos, type Equipo } from '../equipos';
import { getTareas, createTarea, updateTarea } from '../tarea/tareaApi';
import { TareaForm } from '../tarea/TareaForm';
import type { Tarea, TareaCreate } from '../tarea/types';

interface PlanFormProps {
  planInicial?: Plan | null;
  onGuardar: (datos: PlanCreate) => Promise<void>;
  onCancelar: () => void;
}

export function PlanForm({ planInicial, onGuardar, onCancelar }: PlanFormProps) {
  const form = useForm<{
    nombre: string;
    descripcion: string;
    responsableId: number | '';
    sectorId: number | '';
    equipoId: number | '';
  }>({
    defaultValues: { nombre: '', descripcion: '', responsableId: '', sectorId: '', equipoId: '' },
  });
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
    },
  });
  const {
    field: {
      value: descripcion,
      onChange: setDescripcion,
      onBlur: descripcionBlur,
      ref: descripcionRef,
      name: descripcionName,
    },
  } = useController({
    name: 'descripcion',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
      maxLength: { value: 250, message: 'Texto demasiado largo.' },
    },
  });
  const {
    field: {
      value: responsableId,
      onChange: setResponsableId,
      onBlur: responsableIdBlur,
      ref: responsableIdRef,
      name: responsableIdName,
    },
  } = useController({
    name: 'responsableId',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });
  const {
    field: {
      value: sectorId,
      onChange: setSectorId,
      onBlur: sectorIdBlur,
      ref: sectorIdRef,
      name: sectorIdName,
    },
  } = useController({ name: 'sectorId', control: form.control, rules: {} });
  const {
    field: {
      value: equipoId,
      onChange: setEquipoId,
      onBlur: equipoIdBlur,
      ref: equipoIdRef,
      name: equipoIdName,
    },
  } = useController({ name: 'equipoId', control: form.control, rules: {} });
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<number[]>(
    planInicial?.tareas?.map((t) => t.id as number) ?? [],
  );

  const [personal, setPersonal] = useState<Personal[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);

  const [cargandoDependencias, setCargandoDependencias] = useState(true);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const [mostrarModalTarea, setMostrarModalTarea] = useState(false);
  const [mostrarModalSeleccion, setMostrarModalSeleccion] = useState(false);

  const [buscarTarea, setBuscarTarea] = useState('');
  const [tareaAEditar, setTareaAEditar] = useState<Tarea | null>(null);

  useEffect(() => {
    const cargarDependencias = async () => {
      const resultados = await Promise.allSettled([
        loadAllPages((page) => getPersonal(page, 100)),
        loadAllPages((page) => getSectores(page, 100)),
        loadAllPages((page) => getEquipos(page, 100)),
        loadAllPages((page) => getTareas(page, 100)),
      ]);

      const [resPersonal, resSectores, resEquipos, resTareas] = resultados;
      const errores: string[] = [];

      if (resPersonal.status === 'fulfilled') {
        setPersonal(resPersonal.value.items);
      } else {
        console.error('Error cargando Personal:', resPersonal.reason);
        errores.push(
          `Personal: ${resPersonal.reason instanceof Error ? resPersonal.reason.message : String(resPersonal.reason)}`,
        );
      }

      if (resSectores.status === 'fulfilled') {
        setSectores(resSectores.value.items);
      } else {
        console.error('Error cargando sectores:', resSectores.reason);
        errores.push(
          `Sectores: ${resSectores.reason instanceof Error ? resSectores.reason.message : String(resSectores.reason)}`,
        );
      }

      if (resEquipos.status === 'fulfilled') {
        setEquipos(resEquipos.value.items);
      } else {
        console.error('Error cargando equipos:', resEquipos.reason);
        errores.push(
          `Equipos: ${resEquipos.reason instanceof Error ? resEquipos.reason.message : String(resEquipos.reason)}`,
        );
      }

      if (resTareas.status === 'fulfilled') {
        setTareas(resTareas.value.items);
      } else {
        console.error('Error cargando tareas:', resTareas.reason);
        errores.push(
          `Tareas: ${resTareas.reason instanceof Error ? resTareas.reason.message : String(resTareas.reason)}`,
        );
      }

      if (errores.length > 0) {
        setErrorValidacion(errores.join(' | '));
      }

      setCargandoDependencias(false);
    };

    void cargarDependencias();
  }, []);

  useEffect(() => {
    if (planInicial) {
      setNombre(planInicial.nombre);
      setDescripcion(planInicial.descripcion);
      setResponsableId(planInicial.responsable_id);
      setSectorId(planInicial.sector_id || '');
      setEquipoId(planInicial.equipo_id || '');
    }
  }, [planInicial, setNombre, setDescripcion, setResponsableId, setSectorId, setEquipoId]);

  const handleTareaToggle = (id: number) => {
    setTareasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleGuardarTareaDesdePlan = async (datos: TareaCreate) => {
    try {
      if (tareaAEditar?.id) {
        const actualizada = await updateTarea(tareaAEditar.id, datos);
        setTareas(tareas.map((t) => (t.id === actualizada.id ? actualizada : t)));
      } else {
        const creada = await createTarea(datos);
        setTareas([...tareas, creada]);
        setTareasSeleccionadas([...tareasSeleccionadas, creada.id as number]);
      }
      setMostrarModalTarea(false);
      setTareaAEditar(null);
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al guardar la tarea',
      });
    }
  };

  const handleEditarTareaClick = (t: Tarea) => {
    setTareaAEditar(t);
    setMostrarModalTarea(true);
  };

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    setErrorValidacion(null);

    if (!sectorId && !equipoId) {
      setErrorValidacion('Debe asignar el plan a un Sector o a un Equipo.');
      return;
    }
    if (tareasSeleccionadas.length === 0) {
      setErrorValidacion('Debe seleccionar al menos una tarea.');
      return;
    }

    try {
      await onGuardar({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        responsable_id: Number(responsableId),
        sector_id: sectorId ? Number(sectorId) : null,
        equipo_id: equipoId ? Number(equipoId) : null,
        tarea_ids: tareasSeleccionadas,
      });
    } catch (err: unknown) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al guardar.');
    }
  });

  const equiposFiltrados = sectorId
    ? equipos.filter((e) => e.sector_id === Number(sectorId))
    : equipos;
  const personalOperarios = personal.filter((p) => p.operar);

  const tareasVisibles = tareas.filter((t) => {
    if (!t.nombre.toLocaleLowerCase().includes(buscarTarea.toLocaleLowerCase())) return false;
    if (equipoId) return t.equipo_id === Number(equipoId);
    return true;
  });

  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
        <Card.Header as="h5" className="bg-light text-secondary py-3">
          {planInicial ? 'Modificar Plan' : 'Crear Plan de Limpieza'}
        </Card.Header>
        <Card.Body className="p-4">
          {errorValidacion && <Alert variant="danger">{errorValidacion}</Alert>}

          <Form noValidate onSubmit={handleSubmit}>
            <FormErrors errors={form.formState.errors} />
            <Form.Group controlId="PlanForm-nombre" className="mb-3">
              <Form.Label>Nombre del Plan</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. Limpieza General Matutina"
                ref={nombreRef}
                onBlur={nombreBlur}
                name={nombreName}
                value={nombre}
                isInvalid={!!form.formState.errors.nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="PlanForm-descripcion" className="mb-3">
              <Form.Label>Breve Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                required
                maxLength={250}
                placeholder="Describa el objetivo del plan..."
                ref={descripcionRef}
                onBlur={descripcionBlur}
                name={descripcionName}
                value={descripcion}
                isInvalid={!!form.formState.errors.descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="PlanForm-responsableId" className="mb-4">
              <Form.Label>Responsable Asignado</Form.Label>
              <SearchableSelect
                required
                disabled={cargandoDependencias}
                ref={responsableIdRef}
                onBlur={responsableIdBlur}
                name={responsableIdName}
                value={responsableId}
                isInvalid={!!form.formState.errors.responsableId}
                onChange={(e) =>
                  setResponsableId(e.target.value === '' ? '' : Number(e.target.value))
                }
              >
                <option value="">Seleccioná un responsable...</option>
                {personalOperarios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.apellido}, {p.nombre} (DNI: {p.dni})
                  </option>
                ))}
              </SearchableSelect>
            </Form.Group>

            <div className="p-3 bg-light rounded border mb-4">
              <h6 className="mb-3 text-secondary">Ubicación / Destino</h6>
              <div className="row">
                <Form.Group controlId="PlanForm-sectorId" className="col-md-6 mb-3 mb-md-0">
                  <Form.Label>Sector (Opcional si elige equipo)</Form.Label>
                  <SearchableSelect
                    disabled={cargandoDependencias}
                    ref={sectorIdRef}
                    onBlur={sectorIdBlur}
                    name={sectorIdName}
                    value={sectorId}
                    isInvalid={!!form.formState.errors.sectorId}
                    onChange={(e) => {
                      setSectorId(e.target.value === '' ? '' : Number(e.target.value));
                      setEquipoId('');
                    }}
                  >
                    <option value="">Todos los sectores...</option>
                    {sectores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </SearchableSelect>
                </Form.Group>

                <Form.Group controlId="PlanForm-equipoId" className="col-md-6">
                  <Form.Label>Equipo</Form.Label>
                  <SearchableSelect
                    disabled={cargandoDependencias}
                    ref={equipoIdRef}
                    onBlur={equipoIdBlur}
                    name={equipoIdName}
                    value={equipoId}
                    isInvalid={!!form.formState.errors.equipoId}
                    onChange={(e) =>
                      setEquipoId(e.target.value === '' ? '' : Number(e.target.value))
                    }
                  >
                    <option value="">Aplica a todo el sector...</option>
                    {equiposFiltrados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} ({e.numero_serie})
                      </option>
                    ))}
                  </SearchableSelect>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Checklist de Tareas</Form.Label>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setMostrarModalSeleccion(true)}
                  >
                    <i className="bi bi-card-list"></i> Agregar Tarea
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => {
                      setTareaAEditar(null);
                      setMostrarModalTarea(true);
                    }}
                  >
                    <i className="bi bi-plus-lg"></i> Nueva Tarea
                  </Button>
                </div>
              </div>

              <div className="border rounded bg-white">
                {tareasSeleccionadas.length === 0 ? (
                  <div className="text-muted p-3 small text-center">
                    No hay tareas seleccionadas para este plan. Utiliza los botones superiores para
                    agregar o crear tareas.
                  </div>
                ) : (
                  <Table size="sm" striped hover className="mb-0 align-middle">
                    <tbody>
                      {tareasSeleccionadas.map((id) => {
                        const t = tareas.find((x) => x.id === id);
                        if (!t) return null;
                        return (
                          <tr key={`sel-${id}`}>
                            <td className="ps-3 py-2">{t.nombre}</td>
                            <td className="text-end pe-3 py-2" style={{ width: '120px' }}>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="me-1"
                                onClick={() => handleEditarTareaClick(t)}
                                title="Modificar"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleTareaToggle(id)}
                                title="Quitar"
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

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={enviando}>
                {enviando ? 'Guardando...' : 'Guardar Plan'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal
        show={mostrarModalTarea}
        onHide={() => {
          setMostrarModalTarea(false);
          setTareaAEditar(null);
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {tareaAEditar ? `Modificar Tarea #${tareaAEditar.id}` : 'Nueva Tarea'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          <TareaForm
            tareaInicial={tareaAEditar}
            equipoIdFijo={equipoId === '' ? null : Number(equipoId)}
            onGuardar={handleGuardarTareaDesdePlan}
            onCancelar={() => {
              setMostrarModalTarea(false);
              setTareaAEditar(null);
            }}
          />
        </Modal.Body>
      </Modal>

      <Modal show={mostrarModalSeleccion} onHide={() => setMostrarModalSeleccion(false)} size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="text-secondary fs-5">Seleccionar Tareas Existentes</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="p-3">
            <Form.Control
              type="search"
              aria-label="Buscar tareas"
              placeholder="Buscar tareas..."
              value={buscarTarea}
              onChange={(event) => setBuscarTarea(event.target.value)}
            />
          </div>
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th className="ps-4">ID</th>
                <th>Nombre de la Tarea</th>
                <th>Frecuencia</th>
                <th className="text-center pe-4" style={{ width: '130px' }}>
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {tareasVisibles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    No hay tareas disponibles para este equipo/sector.
                  </td>
                </tr>
              ) : (
                tareasVisibles.map((t) => {
                  const seleccionada = t.id !== undefined && tareasSeleccionadas.includes(t.id);
                  return (
                    <tr key={`modal-${t.id}`}>
                      <td className="ps-4">
                        <Badge bg="secondary">#{t.id}</Badge>
                      </td>
                      <td>{t.nombre}</td>
                      <td className="text-capitalize">{t.frecuencia}</td>
                      <td className="text-center pe-4">
                        <Button
                          variant={seleccionada ? 'danger' : 'success'}
                          size="sm"
                          className="w-100"
                          onClick={() => t.id !== undefined && handleTareaToggle(t.id)}
                        >
                          {seleccionada ? (
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
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="primary" onClick={() => setMostrarModalSeleccion(false)}>
            Finalizar Selección
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

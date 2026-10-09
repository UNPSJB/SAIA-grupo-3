import { SortableHeader } from '../../shared/components/SortableHeader';
import { useForm } from 'react-hook-form';
import { useListState } from '../../shared/hooks/useListState';
import { ListControls } from '../../shared/components/ListControls';
import { FormErrors } from '../../shared/components/FormErrors';
import { useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, ProgressBar, Table } from 'react-bootstrap';

import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import type { ConsumoTareaInput } from './checklistApi';
import { useChecklist } from './useChecklist';
import type { ItemChecklist } from './types';

interface ChecklistViewProps {
  personalId: number;
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function textoPeriodo(item: ItemChecklist): string {
  if (item.frecuencia === 'diaria') {
    return 'Hoy';
  }

  return `${formatearFecha(item.periodo_inicio)} al ${formatearFecha(item.periodo_fin)}`;
}

export function ChecklistView({ personalId }: ChecklistViewProps) {
  const { checklist, loading, error, recargar, finalizarTarea } = useChecklist(personalId);

  const [itemAFinalizar, setItemAFinalizar] = useState<ItemChecklist | null>(null);
  const [imagen, setImagen] = useState<File | null>(null);
  const form = useForm<{ cantidades: Record<string, string> }>({
    defaultValues: { cantidades: {} },
    shouldUnregister: true,
  });
  const filters = useListState('tarea');
  const [errorConsumo, setErrorConsumo] = useState<string | null>(null);

  const handleAbrirModal = (item: ItemChecklist) => {
    setItemAFinalizar(item);
    setImagen(null);
    setErrorConsumo(null);

    const cantidadesIniciales = Object.fromEntries(
      (item.tarea.insumos_quimicos ?? []).map((requisito) => [requisito.insumo_quimico_id, '']),
    );

    form.reset({ cantidades: cantidadesIniciales });
  };

  const handleConfirmarFinalizacion = form.handleSubmit(
    async ({ cantidades: cantidadesConsumo }) => {
      if (!itemAFinalizar) return;

      const requisitos = itemAFinalizar.tarea.insumos_quimicos ?? [];

      const faltaCantidad = requisitos.some((requisito) => {
        const cantidad = cantidadesConsumo[requisito.insumo_quimico_id];

        return cantidad === undefined || cantidad.trim() === '';
      });

      if (faltaCantidad) {
        setErrorConsumo('Ingresá el consumo aproximado de cada producto químico.');
        return;
      }

      const consumos: ConsumoTareaInput[] = requisitos.map((requisito) => ({
        insumo_quimico_id: requisito.insumo_quimico_id,
        cantidad_utilizada: Number(cantidadesConsumo[requisito.insumo_quimico_id]),
      }));

      const finalizada = await finalizarTarea(itemAFinalizar.id, imagen, consumos);

      if (finalizada) {
        setItemAFinalizar(null);
      }
    },
  );

  if (loading && !checklist) {
    return <LoadingSpinner mensaje="Cargando checklist..." />;
  }

  if (error && !checklist) {
    return <ErrorAlert mensaje={error} />;
  }

  if (!checklist) {
    return null;
  }

  const visibles = checklist.items
    .filter((item) =>
      `${item.tarea.nombre} ${item.plan.nombre} ${item.frecuencia} ${item.estado}`
        .toLocaleLowerCase()
        .includes(filters.busqueda.toLocaleLowerCase()),
    )
    .sort((left, right) => {
      const value = (item: ItemChecklist) =>
        filters.ordenarPor === 'plan'
          ? item.plan.nombre
          : filters.ordenarPor === 'estado'
            ? item.estado
            : item.tarea.nombre;
      return (
        value(left).localeCompare(value(right), 'es') * (filters.orden === 'desc' ? -1 : 1) ||
        left.id - right.id
      );
    });
  const porcentaje =
    checklist.total > 0 ? Math.round((checklist.realizadas / checklist.total) * 100) : 0;

  return (
    <>
      <div className="mb-3">
        <h4 className="mb-1 text-secondary fw-normal">
          {checklist.responsable.apellido}, {checklist.responsable.nombre}
        </h4>
        <small className="text-muted">Checklist del {formatearFecha(checklist.fecha)}</small>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => void recargar()}>
          {error}
        </Alert>
      )}

      {checklist.total > 0 && (
        <div className="mb-3">
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>
              {checklist.realizadas} de {checklist.total} tareas realizadas
            </span>
            <span>{checklist.pendientes} pendientes</span>
          </div>

          <ProgressBar now={porcentaje} label={`${porcentaje}%`} variant="success" />
        </div>
      )}

      <ListControls {...filters}>
        <Button
          variant="success"
          onClick={recargar}
          disabled={loading || form.formState.isSubmitting}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          <span>Actualizar</span>
        </Button>
      </ListControls>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <SortableHeader column="tarea" {...filters}>
                  Tarea
                </SortableHeader>
                <SortableHeader column="plan" {...filters}>
                  Plan
                </SortableHeader>
                <th>Frecuencia</th>
                <th>Período</th>
                <SortableHeader column="estado" {...filters}>
                  Estado
                </SortableHeader>
                <th className="text-center">Acción</th>
              </tr>
            </thead>

            <tbody>
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    {filters.busqueda
                      ? 'No hay tareas para la búsqueda actual.'
                      : 'No hay tareas asignadas para hoy.'}
                  </td>
                </tr>
              ) : (
                visibles.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.tarea.nombre}</strong>
                    </td>
                    <td>{item.plan.nombre}</td>
                    <td>
                      <Badge bg="info" className="text-dark text-capitalize">
                        {item.frecuencia}
                      </Badge>
                    </td>
                    <td>
                      <small className="text-muted">{textoPeriodo(item)}</small>
                    </td>
                    <td>
                      {item.estado === 'realizada' ? (
                        <Badge bg="success">Realizada</Badge>
                      ) : (
                        <Badge bg="warning" className="text-dark">
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="text-center">
                      {item.estado === 'realizada' ? (
                        <span className="text-success small fw-semibold">
                          <i className="bi bi-check2-all fs-5" />
                        </span>
                      ) : (
                        <Button
                          variant="success"
                          size="sm"
                          className="py-1 px-2 shadow-sm"
                          onClick={() => handleAbrirModal(item)}
                          disabled={loading || form.formState.isSubmitting}
                        >
                          <i className="bi bi-check-circle me-1" />
                          Realizar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal
        show={itemAFinalizar !== null}
        onHide={() => setItemAFinalizar(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 text-secondary">
            <i className="bi bi-card-checklist me-2" />
            Detalle de tarea
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <FormErrors errors={form.formState.errors} />
          {itemAFinalizar && (
            <>
              <h5 className="fw-bold mb-1">{itemAFinalizar.tarea.nombre}</h5>

              <div className="d-flex gap-2 mb-3">
                <Badge bg="primary">{itemAFinalizar.plan.nombre}</Badge>
                <Badge bg="info" className="text-dark text-capitalize">
                  {itemAFinalizar.frecuencia}
                </Badge>
              </div>

              <div className="bg-light p-3 rounded border mb-4">
                <h6 className="fw-bold border-bottom pb-2 mb-3">Procedimiento a seguir</h6>
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {itemAFinalizar.tarea.procedimiento}
                </p>
              </div>

              {(itemAFinalizar.tarea.insumos_quimicos ?? []).length > 0 && (
                <div className="bg-light p-3 rounded border mb-4">
                  <h6 className="fw-bold border-bottom pb-2 mb-3">
                    Consumo aproximado de productos químicos
                  </h6>

                  {errorConsumo && (
                    <Alert variant="warning" className="py-2">
                      {errorConsumo}
                    </Alert>
                  )}

                  {itemAFinalizar.tarea.insumos_quimicos?.map((requisito) => {
                    const insumo = requisito.insumo_quimico;
                    const unidad = insumo?.unidadMedidaObj?.sufijo ?? '';

                    return (
                      <Form.Group className="mb-3" key={requisito.insumo_quimico_id}>
                        <Form.Label>
                          {insumo?.nombre ?? `Producto ${requisito.insumo_quimico_id}`}
                          {unidad ? ` (${unidad})` : ''}
                          <span className="text-muted">
                            {' '}
                            — referencia del plan: {requisito.cantidad} {unidad}
                          </span>
                        </Form.Label>

                        <Form.Control
                          type="number"
                          min="0"
                          step="any"
                          {...form.register(`cantidades.${requisito.insumo_quimico_id}`, {
                            validate: (value) =>
                              (value !== '' &&
                                value !== undefined &&
                                Number.isFinite(Number(value)) &&
                                Number(value) >= 0) ||
                              'Ingresá una cantidad válida mayor o igual a cero.',
                          })}
                          placeholder="Cantidad realmente utilizada"
                        />
                      </Form.Group>
                    );
                  })}
                </div>
              )}

              <Form.Group className="mb-2">
                <Form.Label className="fw-semibold">
                  <i className="bi bi-camera me-1" />
                  Adjuntar evidencia fotográfica (opcional)
                </Form.Label>

                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setImagen(event.target.files?.[0] ?? null);
                  }}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="border-top-0 pt-0 px-4 pb-4">
          <Button
            variant="secondary"
            onClick={() => setItemAFinalizar(null)}
            disabled={loading || form.formState.isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            variant="success"
            onClick={() => void handleConfirmarFinalizacion()}
            disabled={loading || form.formState.isSubmitting}
          >
            {loading ? 'Completando...' : 'Realizar tarea'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

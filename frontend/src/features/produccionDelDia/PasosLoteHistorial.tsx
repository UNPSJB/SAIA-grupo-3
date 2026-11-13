import { useState } from 'react';
import { Badge, Button, ListGroup, Modal } from 'react-bootstrap';
import { ImagenProtegida } from '../../shared/components/ImagenProtegida';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import type { PasoConMovimientos } from './types';

interface PasosLoteHistorialProps {
  pasos: PasoConMovimientos[];
}

export function PasosLoteHistorial({ pasos }: PasosLoteHistorialProps) {
  const [foto, setFoto] = useState<{ ruta: string; titulo: string } | null>(null);
  const realizados = pasos.filter((paso) => paso.estado === 'realizado').length;

  return (
    <>
      <h6 className="fw-bold border-bottom pb-2 mt-4 d-flex justify-content-between">
        <span>Pasos de elaboración</span>
        <span className="fw-normal text-body-secondary small">
          {realizados} de {pasos.length} realizados
        </span>
      </h6>
      <ListGroup as="ol" className="mb-2">
        {pasos.map((paso) => (
          <ListGroup.Item as="li" key={paso.id} className="py-3">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span className="fw-semibold">
                {paso.orden}. {paso.nombre}
              </span>
              {paso.punto_control && <Badge bg="danger">Punto de control</Badge>}
              <Badge
                bg={paso.estado === 'realizado' ? 'success' : 'warning'}
                text={paso.estado === 'realizado' ? undefined : 'dark'}
                className="ms-auto"
              >
                {paso.estado === 'realizado' ? 'Realizado' : 'Pendiente'}
              </Badge>
            </div>
            {paso.movimientos.length === 0 ? (
              <div className="small text-body-secondary">Sin movimientos.</div>
            ) : (
              <ul className="small mb-0 ps-3">
                {paso.movimientos.map((movimiento) => (
                  <li
                    key={movimiento.id}
                    className={movimiento.accion === 'anulado' ? 'text-danger' : undefined}
                  >
                    <span className="fw-semibold">
                      {movimiento.accion === 'realizado' ? 'Realizado' : 'Anulado'}
                    </span>{' '}
                    por {movimiento.personal.nombre} {movimiento.personal.apellido} el{' '}
                    {formatearFechaHora(movimiento.fecha_hora)}
                    {movimiento.valor_medido !== null && (
                      <> · valor medido {movimiento.valor_medido}</>
                    )}
                    {movimiento.observacion && <> · {movimiento.observacion}</>}
                    {movimiento.motivo && <> · Motivo: {movimiento.motivo}</>}
                    {movimiento.foto_path && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 ms-2 align-baseline"
                        onClick={() =>
                          setFoto({
                            ruta: movimiento.foto_path ?? '',
                            titulo: `${paso.orden}. ${paso.nombre}`,
                          })
                        }
                      >
                        Ver foto
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
      <Modal show={foto !== null} onHide={() => setFoto(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">{foto?.titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {foto && (
            <ImagenProtegida
              ruta={foto.ruta}
              alt={`Foto del paso ${foto.titulo}`}
              className="img-fluid rounded"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

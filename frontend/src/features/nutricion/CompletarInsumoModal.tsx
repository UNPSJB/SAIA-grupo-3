import { Button, Modal } from 'react-bootstrap';
import { NutricionInsumo } from './NutricionInsumo';

interface Props {
  insumo: { id: number; nombre: string } | null;
  onCambio: () => void;
  onCerrar: () => void;
}

export function CompletarInsumoModal({ insumo, onCambio, onCerrar }: Props) {
  return (
    <Modal show={insumo !== null} onHide={onCerrar} size="xl" fullscreen="lg-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">Datos nutricionales de {insumo?.nombre}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {insumo && <NutricionInsumo key={insumo.id} insumoId={insumo.id} onCambio={onCambio} />}
      </Modal.Body>
      <Modal.Footer>
        <span className="small text-body-secondary me-auto">
          La tabla de la receta se recalcula al guardar cada cambio.
        </span>
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

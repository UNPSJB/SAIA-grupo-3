import { Badge, Button, Form } from 'react-bootstrap';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import type { CampoAutomaticoEstado } from './types';

interface Props {
  estado: CampoAutomaticoEstado;
  valor: string;
  multilinea?: boolean;
  ayuda?: string;
  onChange: (valor: string) => void;
}

export function CampoAutomatico({ estado, valor, multilinea = false, ayuda, onChange }: Props) {
  const sistema = estado.valor_sistema ?? '';
  const distinto = valor.trim() !== sistema;
  const id = `campo-${estado.campo}`;
  return (
    <Form.Group controlId={id} className="mb-1">
      <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
        <Form.Label className="mb-0 fw-semibold">{estado.etiqueta}</Form.Label>
        <Badge bg="info" text="dark" className="fw-normal text-wrap text-start">
          <i className="bi bi-magic me-1" aria-hidden="true" />
          {estado.origen}
        </Badge>
        {estado.editado && (
          <Badge bg="warning" text="dark" className="fw-normal text-wrap text-start">
            Editado a mano
            {estado.editado_por &&
              ` por ${estado.editado_por.nombre} ${estado.editado_por.apellido}`}
            {estado.editado_en && `, ${formatearFechaHora(estado.editado_en)}`}
          </Badge>
        )}
      </div>
      {multilinea ? (
        <Form.Control
          as="textarea"
          rows={4}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Form.Control value={valor} onChange={(e) => onChange(e.target.value)} />
      )}
      {ayuda && <Form.Text>{ayuda}</Form.Text>}
      {estado.cambio_en_sistema && (
        <div className="small text-warning-emphasis mt-1">
          <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />
          El dato del sistema cambió: ahora es «{sistema || 'vacío'}».
        </div>
      )}
      {distinto && (
        <div className="d-flex flex-wrap gap-2 align-items-center small mt-1">
          <span className="text-warning-emphasis">
            <i className="bi bi-pencil-square me-1" aria-hidden="true" />
            {estado.editado && !estado.cambio_en_sistema
              ? 'Distinto del dato del sistema.'
              : 'Al guardar queda registrado que se editó a mano (valor anterior, nuevo, quién y cuándo).'}
          </span>
          {sistema && (
            <Button size="sm" variant="link" className="p-0" onClick={() => onChange(sistema)}>
              Volver al dato del sistema
            </Button>
          )}
        </div>
      )}
    </Form.Group>
  );
}

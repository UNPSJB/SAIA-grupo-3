import { Badge } from 'react-bootstrap';
import type { EstadoLote } from './types';

export function EstadoLoteBadge({ estado }: { estado: EstadoLote }) {
  return estado === 'cerrado' ? (
    <Badge bg="secondary">Cerrado</Badge>
  ) : (
    <Badge bg="success">Abierto</Badge>
  );
}

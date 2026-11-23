import { Badge } from 'react-bootstrap';
import { ESTADOS_LOTE } from './estados';
import type { EstadoLote } from './types';

export function EstadoLoteBadge({ estado }: { estado: EstadoLote }) {
  const { etiqueta, bg, text } = ESTADOS_LOTE[estado];
  return (
    <Badge bg={bg} text={text}>
      {etiqueta}
    </Badge>
  );
}

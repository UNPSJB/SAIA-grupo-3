import { Badge } from 'react-bootstrap';
import { FUENTES, type FuenteNutricional } from './types';

export function InsigniaFuente({ fuente }: { fuente: FuenteNutricional }) {
  const { etiqueta, color } = FUENTES[fuente];
  return (
    <Badge bg={color} className="fw-normal">
      {etiqueta}
    </Badge>
  );
}

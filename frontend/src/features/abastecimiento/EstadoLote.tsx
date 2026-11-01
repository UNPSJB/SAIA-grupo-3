import { Badge } from 'react-bootstrap';
import type { EstadoVencimiento } from './types';

export function EstadoLote({ estado }: { estado: EstadoVencimiento }) {
  const color = estado === 'vencido' ? 'danger' : estado === 'por_vencer' ? 'warning' : 'success';
  return (
    <Badge bg={color} text={estado === 'por_vencer' ? 'dark' : undefined}>
      {estado === 'vencido' ? 'Vencido' : estado === 'por_vencer' ? 'Próximo a vencer' : 'Vigente'}
    </Badge>
  );
}

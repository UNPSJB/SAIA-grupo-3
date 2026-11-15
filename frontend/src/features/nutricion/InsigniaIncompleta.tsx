import { Badge } from 'react-bootstrap';

interface Props {
  completa: boolean | null | undefined;
  texto?: string;
  mostrarCompleta?: boolean;
}

export function InsigniaIncompleta({
  completa,
  texto = 'Incompleta',
  mostrarCompleta = false,
}: Props) {
  if (completa === false) {
    return (
      <Badge
        bg="warning"
        text="dark"
        title="Calculada con datos faltantes: revisá la advertencia antes de usarla."
      >
        <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />
        {texto}
      </Badge>
    );
  }
  if (completa === true && mostrarCompleta) return <Badge bg="success">Completa</Badge>;
  return null;
}

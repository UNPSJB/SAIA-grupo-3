import type { ReactNode } from 'react';
import { Form } from 'react-bootstrap';
interface Props {
  busqueda: string;
  setBusqueda: (value: string) => void;
  title?: ReactNode;
  children?: ReactNode;
  filters?: ReactNode;
}
export function ListControls({ busqueda, setBusqueda, title, children, filters }: Props) {
  return (
    <div className="mb-3">
      {title && <h4 className="text-secondary fw-normal mb-3">{title}</h4>}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Form.Control
            type="search"
            aria-label="Buscar registros"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            style={{ width: 320, maxWidth: '100%' }}
          />
          {filters}
        </div>
        {children && (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 ms-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

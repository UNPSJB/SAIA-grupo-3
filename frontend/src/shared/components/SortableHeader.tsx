import type { ReactNode } from 'react';
interface Props {
  column: string;
  ordenarPor: string;
  orden: string;
  cambiarOrden: (column: string) => void;
  children: ReactNode;
  className?: string;
}
export function SortableHeader({
  column,
  ordenarPor,
  orden,
  cambiarOrden,
  children,
  className,
}: Props) {
  const active = column === ordenarPor;
  return (
    <th
      className={className}
      aria-sort={active ? (orden === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="btn p-0 border-0 text-reset fw-semibold d-inline-flex align-items-center gap-1 text-nowrap"
        onClick={() => cambiarOrden(column)}
      >
        {children}
        <i
          aria-hidden="true"
          className={`bi ${active ? (orden === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down') : 'bi-chevron-expand'} ${active ? 'text-success' : 'text-muted'}`}
          style={{ fontSize: '0.8rem' }}
        />
      </button>
    </th>
  );
}

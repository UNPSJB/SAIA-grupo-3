import { Pagination } from 'react-bootstrap';
interface Props {
  page: number;
  totalPages: number;
  total: number;
  changePage: (page: number) => void;
}
export function ListPagination({ page, totalPages, total, changePage }: Props) {
  if (!totalPages) return null;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100">
      <span className="small text-body-secondary">
        Página {page} de {totalPages} ({total} registros)
      </span>
      <Pagination size="sm" className="mb-0 ms-auto">
        <Pagination.Prev disabled={page === 1} onClick={() => changePage(page - 1)} />
        {pages.map((number) => (
          <Pagination.Item key={number} active={number === page} onClick={() => changePage(number)}>
            {number}
          </Pagination.Item>
        ))}
        <Pagination.Next disabled={page >= totalPages} onClick={() => changePage(page + 1)} />
      </Pagination>
    </div>
  );
}

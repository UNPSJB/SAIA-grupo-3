interface TopHeaderProps {
  busqueda?: string;
  onBusquedaChange?: (valor: string) => void;
}

export function TopHeader({ busqueda = '', onBusquedaChange }: TopHeaderProps) {
  return (
    <header
      className="position-fixed top-0 end-0 bg-white border-bottom px-4 d-flex align-items-center z-2 shadow-xs"
      style={{ left: '260px', height: '64px' }}
    >
      {/* <div
        className="d-flex align-items-center bg-light px-3 py-1 rounded-pill border"
        style={{ width: '380px' }}
      >
        <i className="bi bi-search text-muted me-2"></i>
        <input
          type="text"
          className="form-control bg-transparent border-0 p-0 shadow-none small"
          placeholder="Buscar registros..."
          value={busqueda}
          onChange={(e) => onBusquedaChange && onBusquedaChange(e.target.value)}
        />
      </div> */}
    </header>
  );
}
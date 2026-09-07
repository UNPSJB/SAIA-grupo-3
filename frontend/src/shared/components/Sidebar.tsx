import { NavLink } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside
      className="position-fixed top-0 start-0 bottom-0 bg-white border-end d-flex flex-column z-3 shadow-sm"
      style={{ width: '260px' }}
    >
      {/* Brand / Logo */}
      <div className="d-flex align-items-center gap-2 px-4 py-4 mb-2">
        {/* <i className="bi bi-grid-1x2-fill text-primary fs-4"></i> Buscar un icono acorde */}
        <span className="fs-5 fw-bold text-dark tracking-tight">SAIA</span>
      </div>

      {/* Menú de navegación */}
      <nav className="nav nav-pills flex-column px-3 gap-1">
        <NavLink
          to="/personal"
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover-bg-light'
            }`
          }
        >
          {/* <i className="bi bi-person-badge fs-5"></i> Buscar un icono acorde*/}
          <span>Personal</span>
        </NavLink>

        <NavLink
          to="/equipos"
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover-bg-light'
            }`
          }
        >
          {/* <i className="bi bi-people fs-5"></i> Buscar un icono acorde*/}
          <span>Equipos</span>
        </NavLink>

        <NavLink
          to="/insumo"
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover-bg-light'
            }`
          }
        >
          {/* <i className="bi bi-journal-bookmark fs-5"></i>  Buscar un icono acorde*/}
          <span>Insumo</span>
        </NavLink>
      </nav>
    </aside>
  );
}
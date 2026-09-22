import { NavLink } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';

interface SidebarProps {
  show: boolean;
  onClose: () => void;
}

export function Sidebar({ show, onClose }: SidebarProps) {
  const MenuContent = () => (
    <>
      <div className="d-flex align-items-center gap-2 px-4 py-4 mb-2">
        <span className="fs-5 fw-bold text-dark tracking-tight">SAIA</span>
      </div>
      <nav className="nav nav-pills flex-column px-3 gap-1">
        {[
          { to: "/personal", label: "Personal" },
          { to: "/equipos", label: "Equipos" },
          { to: "/insumos", label: "Insumo" },
          { to: "/unidades-medida", label: "Unidades de Medida" },
          { to: "/tarea", label: "Tarea" }
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
                isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
              }`
            }
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <aside
        className="position-fixed top-0 start-0 bottom-0 bg-white border-end d-none d-md-flex flex-column z-3 shadow-sm"
        style={{ width: '260px' }}
      >
        <MenuContent />
      </aside>


      <Offcanvas show={show} onHide={onClose} placement="start" responsive="md">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Menú</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0 flex-column">
          <MenuContent />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
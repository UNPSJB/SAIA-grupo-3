import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Offcanvas, Collapse } from 'react-bootstrap';

interface SidebarProps {
  show: boolean;
  onClose: () => void;
}

export function Sidebar({ show, onClose }: SidebarProps) {
  const location = useLocation();
  const esRutaInsumos = location.pathname.startsWith('/insumos');
  const [openInsumos, setOpenInsumos] = useState(esRutaInsumos);

  useEffect(() => {
    if (esRutaInsumos) {
      setOpenInsumos(true);
    }
  }, [esRutaInsumos]);

  const MenuContent = () => (
    <>
      <div className="d-flex align-items-center gap-2 px-4 py-4 mb-2">
        <span className="fs-5 fw-bold text-dark tracking-tight">SAIA</span>
      </div>
      <nav className="nav nav-pills flex-column px-3 gap-1">
        <NavLink
          to="/personal"
          onClick={onClose}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
              isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
            }`
          }
        >
          <span>Personal</span>
        </NavLink>

        <NavLink
          to="/equipos"
          onClick={onClose}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
              isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
            }`
          }
        >
          <span>Equipos</span>
        </NavLink>

        {/* Desplegable Insumos */}
        <div>
          <div
            onClick={() => setOpenInsumos(!openInsumos)}
            className={`nav-link d-flex justify-content-between align-items-center px-3 py-2 rounded-3 fw-medium user-select-none ${
              esRutaInsumos ? 'text-dark' : 'text-secondary hover-bg-light'
            }`}
            style={{ cursor: 'pointer' }}
            aria-controls="insumos-collapse"
            aria-expanded={openInsumos}
          >
            {/* Ícono a la derecha y forzado a oscuro */}
            <span>Insumos</span>
            <i className={`bi bi-chevron-${openInsumos ? 'down' : 'right'} text-dark ms-auto small`}></i>

          </div>

          <Collapse in={openInsumos}>
            {/* Div contenedor neutro para permitir que la animación funcione sin chocar con d-flex */}
            <div id="insumos-collapse">
              <div className="d-flex flex-column gap-1 mt-1">
                <NavLink
                  to="/insumos"
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center gap-2 py-1 rounded-3 small fw-medium ${
                      isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
                    }`
                  }
                  style={{ paddingLeft: '3rem' }}
                >
                  <i className="bi bi-box-seam me-1"></i>
                  <span>Insumos / Ingredientes</span>
                </NavLink>

                <NavLink
                  to="/insumos-quimicos"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center gap-2 py-1 rounded-3 small fw-medium ${
                      isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
                    }`
                  }
                  style={{ paddingLeft: '3rem' }}
                >
                  <i className="bi bi-droplet-half me-1"></i>
                  <span>Insumos Químicos</span>
                </NavLink>
              </div>
            </div>
          </Collapse>
        </div>

        <NavLink
          to="/unidades-medida"
          onClick={onClose}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
              isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
            }`
          }
        >
          <span>Unidades de Medida</span>
        </NavLink>

        <NavLink
          to="/sectores"
          onClick={onClose}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
              isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
            }`
          }
        >
          <span>Sectores</span>
        </NavLink>
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
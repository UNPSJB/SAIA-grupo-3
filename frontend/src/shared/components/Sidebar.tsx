import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Offcanvas, Collapse } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  show: boolean;
  onClose: () => void;
}

interface MenuItem {
  to?: string;
  label: string;
  icono: string;
  esDesplegable?: boolean;
  subItems?: {
    to: string;
    label: string;
    icono: string;
    end?: boolean;
  }[];
}

export function Sidebar({ show, onClose }: SidebarProps) {
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const esRutaMaestros = [
    '/personal',
    '/sectores',
    '/equipos',
    '/insumos',
    '/insumos-quimicos',
    '/unidades-medida',
    '/elementos',
  ].some(
    (ruta) =>
      location.pathname === ruta ||
      location.pathname.startsWith(`${ruta}/`)
  );

  const [openMaestros, setOpenMaestros] = useState(esRutaMaestros);

  useEffect(() => {
    if (esRutaMaestros) {
      setOpenMaestros(true);
    }
  }, [esRutaMaestros]);

  const menuItems: MenuItem[] = [
    {
      label: 'Datos maestros',
      icono: 'bi bi-database',
      esDesplegable: true,
      subItems: [
        {
          to: '/personal',
          label: 'Personal',
          icono: 'bi bi-people',
        },
        {
          to: '/sectores',
          label: 'Sectores',
          icono: 'bi bi-diagram-3',
        },
        {
          to: '/equipos',
          label: 'Equipos e instrumentos',
          icono: 'bi bi-tools',
        },
        {
          to: '/insumos',
          label: 'Insumos / Ingredientes',
          icono: 'bi bi-box-seam',
          end: true,
        },
        {
          to: '/insumos-quimicos',
          label: 'Insumos químicos',
          icono: 'bi bi-droplet-half',
        },
        {
          to: '/elementos',
          label: 'Elementos de limpieza',
          icono: 'bi bi-bucket-fill',
        },
        {
          to: '/unidades-medida',
          label: 'Unidades de medida',
          icono: 'bi bi-rulers',
        },
      ],
    },
    {
      to: '/tarea',
      label: 'Tareas',
      icono: 'bi bi-list-task',
    },
    {
      to: '/planes',
      label: 'Planes de limpieza',
      icono: 'bi bi-clipboard2-check',
    },
    {
      to: '/checklist',
      label: 'Checklist del día',
      icono: 'bi bi-check2-square',
    },
    {
      to: '/auditoria',
      label: 'Historial de checklist',
      icono: 'bi bi-clock-history',
    },
    {
      to: '/reportes/consumos',
      label: 'Consumo de insumos químicos',
      icono: 'bi bi-bar-chart-line',
    },
  ];

  const menuContent = (
    <>
      <div className="d-flex align-items-center gap-2 px-4 py-4 mb-2">
        <span className="fs-5 fw-bold text-dark tracking-tight">
          SAIA
        </span>
      </div>

      {currentUser && (
        <div className="mx-3 p-2 bg-light rounded text-center mb-3 border">
          <span className="fw-bold d-block text-truncate">
            {currentUser.nombre} {currentUser.apellido}
          </span>
        </div>
      )}

      <nav className="nav nav-pills flex-column px-3 gap-1 mb-auto">
        {menuItems
          .filter((item) => {
            if (item.to === '/checklist') {
              return currentUser?.operar === true;
            }

            return currentUser?.administrar === true;
          })
          .map((item) => {
            if (item.esDesplegable) {
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setOpenMaestros((abierto) => !abierto)}
                    className={`nav-link w-100 border-0 bg-transparent d-flex justify-content-between align-items-center px-3 py-2 rounded-3 fw-medium ${
                      esRutaMaestros
                        ? 'text-dark'
                        : 'text-secondary hover-bg-light'
                    }`}
                    aria-controls="maestros-collapse"
                    aria-expanded={openMaestros}
                  >
                    <span className="d-flex align-items-center gap-3">
                      <i className={item.icono}></i>
                      {item.label}
                    </span>

                    <i
                      className={`bi ${
                        openMaestros
                          ? 'bi-chevron-up'
                          : 'bi-chevron-down'
                      } text-dark ms-2`}
                    ></i>
                  </button>

                  <Collapse in={openMaestros}>
                    <div id="maestros-collapse">
                      <div className="d-flex flex-column gap-1 mt-1">
                        {item.subItems?.map((sub) => (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            end={sub.end}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `nav-link d-flex align-items-center gap-2 py-2 rounded-3 small fw-medium ${
                                isActive
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-secondary hover-bg-light'
                              }`
                            }
                            style={{ paddingLeft: '2rem' }}
                          >
                            <i className={`${sub.icono} flex-shrink-0`}></i>
                            <span>{sub.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </Collapse>
                </div>
              );
            }

            if (!item.to) return null;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium text-wrap overflow-hidden ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-secondary hover-bg-light'
                  }`
                }
                style={{ wordBreak: 'break-word', lineHeight: '1.2' }}
              >
                <i className={`${item.icono} flex-shrink-0 fs-5`}></i>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      <div className="p-3 border-top mt-3">
        <button
          type="button"
          onClick={() => void logout()}
          className="btn btn-outline-danger w-100 btn-sm"
        >
          <i className="bi bi-box-arrow-left me-2"></i>
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="position-fixed top-0 start-0 bottom-0 bg-body border-end d-none d-md-flex flex-column z-3 shadow-sm overflow-auto"
        style={{ width: '260px' }}
      >
        {menuContent}
      </aside>

      <Offcanvas show={show} onHide={onClose} placement="start" className="d-md-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">
            Menú
          </Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="d-flex flex-column p-0">
          {menuContent}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
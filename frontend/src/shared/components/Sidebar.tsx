import { permissions } from '../libreria/permissions';
import { useState } from 'react';
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
  grupo?: 'vencimientos' | 'maestros';
  subItems?: {
    to: string;
    label: string;
    icono: string;
    end?: boolean;
  }[];
}

export function Sidebar({ show, onClose }: SidebarProps) {
  const location = useLocation();
  const { currentUser } = useAuth();

  const { canAdmin, canOperate } = permissions(currentUser);

  const menuItems: MenuItem[] = [
    { to: '/planes', label: 'Planes de Limpieza', icono: 'bi bi-clipboard2-check' },
    { to: '/auditoria', label: 'Historial Checklist', icono: 'bi bi-clock-history' },
    { to: '/checklist', label: 'Checklist del Día', icono: 'bi bi-check2-square' },
    { to: '/consumos', label: 'Registros de Consumo', icono: 'bi bi-droplet' },
    {
      to: '/reportes/consumos',
      label: 'Consumo de Insumos Químicos',
      icono: 'bi bi-bar-chart-line',
    },
    { to: '/incidentes', label: 'Incidentes', icono: 'bi bi-exclamation-triangle' },
    {
      label: 'Vencimientos',
      icono: 'bi bi-calendar-x',
      grupo: 'vencimientos',
      subItems: [
        { to: '/personal/vencimientos', label: 'Personal', icono: 'bi bi-person-vcard' },
        { to: '/vencimientos/calibracion', label: 'Calibración', icono: 'bi bi-tools' },
      ],
    },
    {
      label: 'Datos Maestros',
      icono: 'bi bi-database',
      grupo: 'maestros',
      subItems: [
        { to: '/personal', label: 'Personal', icono: 'bi bi-people', end: true },
        { to: '/sectores', label: 'Sectores', icono: 'bi bi-diagram-3' },
        { to: '/tipos-documento', label: 'Tipo Documento', icono: 'bi bi-file-earmark-text' },
        { to: '/equipos', label: 'Equipos e Instrumentos', icono: 'bi bi-tools' },
        { to: '/insumos', label: 'Insumos / Ingredientes', icono: 'bi bi-box-seam', end: true },
        { to: '/insumos-quimicos', label: 'Insumos Químicos', icono: 'bi bi-droplet-half' },
        { to: '/unidades-medida', label: 'Unidad de Medida', icono: 'bi bi-rulers' },
        { to: '/elementos', label: 'Elementos de Limpieza', icono: 'bi bi-bucket-fill' },
        { to: '/tarea', label: 'Tareas', icono: 'bi bi-list-task' },
      ],
    },
  ];

  const grupoActivo = menuItems.find((item) =>
    item.subItems?.some(
      (sub) =>
        location.pathname === sub.to || (!sub.end && location.pathname.startsWith(`${sub.to}/`)),
    ),
  )?.grupo;

  const [gruposAbiertos, setGruposAbiertos] = useState<
    Partial<Record<'vencimientos' | 'maestros', boolean>>
  >({});

  const menuContent = (
    <>
      <div className="d-flex align-items-center gap-2 px-4 py-4 mb-2">
        <span className="fs-5 fw-bold text-dark tracking-tight">SAIA</span>
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
            if (item.to === '/checklist' || item.to === '/incidentes') {
              return canOperate;
            }

            return canAdmin;
          })
          .map((item) => {
            if (item.grupo) {
              const grupo = item.grupo;
              const abierto = gruposAbiertos[grupo] ?? grupoActivo === grupo;
              const collapseId = `${grupo}-collapse`;
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setGruposAbiertos((prev) => ({ ...prev, [grupo]: !abierto }))
                    }
                    className={`nav-link w-100 border-0 bg-transparent d-flex justify-content-between align-items-center px-3 py-2 rounded-3 fw-medium ${
                      grupoActivo === grupo ? 'text-dark' : 'text-secondary hover-bg-light'
                    }`}
                    aria-controls={collapseId}
                    aria-expanded={abierto}
                  >
                    <span className="d-flex align-items-center gap-3">
                      <i className={item.icono}></i>
                      {item.label}
                    </span>

                    <i
                      className={`bi ${
                        abierto ? 'bi-chevron-up' : 'bi-chevron-down'
                      } text-dark ms-2`}
                    ></i>
                  </button>

                  <Collapse in={abierto}>
                    <div id={collapseId}>
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
                    isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
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
          <Offcanvas.Title className="fw-bold">Menú</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="d-flex flex-column p-0">{menuContent}</Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

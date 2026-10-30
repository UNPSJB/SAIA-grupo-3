import { useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Offcanvas, Collapse } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  show: boolean;
  onClose: () => void;
}

type Permiso = 'operar' | 'administrar' | 'consultarOperacion';

interface MenuItem {
  to?: string;
  end?: boolean;
  label: string;
  icono: string;
  permiso?: Permiso;
  grupo?: 'incidentes' | 'maestros';
  subItems?: {
    to: string;
    label: string;
    icono: string;
    end?: boolean;
    permiso?: Permiso;
  }[];
}
export function Sidebar({ show, onClose }: SidebarProps) {
  const location = useLocation();
  const { currentUser } = useAuth();


  const menuItems: MenuItem[] = [
    { to: '/inicio', label: 'Inicio', icono: 'bi bi-house-door', permiso: 'administrar'},
    { to: '/vista-publica/configuracion', label: 'Vista pública', icono: 'bi bi-globe', permiso: 'administrar'},
    { to: '/tablero', label: 'Tablero de gestión', icono: 'bi bi-graph-up' },
    { to: '/planes', label: 'Planes de Limpieza', icono: 'bi bi-clipboard2-check' },
    { to: '/auditoria', label: 'Historial Checklist', icono: 'bi bi-clock-history' },
    { to: '/lotes', label: 'Historial de lotes', icono: 'bi bi-box-seam' },
    { to: '/checklist', label: 'Checklist del Día', icono: 'bi bi-check2-square', permiso: 'operar' },
    { to: '/reportes/consumos', label: 'Consumo de Insumos Químicos', icono: 'bi bi-bar-chart-line' },
    { to: "/consumos", label: "Registros de Consumo", icono: "bi bi-droplet" },
    { to: '/lotes-produccion', label: 'Lotes de Producción', icono: 'bi bi-box2', permiso: 'consultarOperacion' },
    { to: "/documentos-vigentes", label: "Documentos vigentes", icono: "bi bi-journal-check", permiso: "operar" },
    { to: "/documentos-tecnicos", label: "Documentos Técnicos", icono: "bi bi-journal-text" },
    { to: '/vencimientos', label: 'Vencimientos', icono: 'bi bi-calendar-x' },
    ...(currentUser?.administrar ? [{
      label: 'Incidentes',
      icono: 'bi bi-exclamation-triangle',
      grupo: 'incidentes',
      subItems: [
        { to: '/incidentes', label: 'Incidentes', icono: 'bi bi-list-ul', end: true, permiso: 'consultarOperacion' },
        { to: '/incidentes/abiertos', label: 'Abiertos', icono: 'bi bi-hourglass-split' },
      ],
    } satisfies MenuItem] : [{
      to: '/incidentes',
      label: 'Incidentes',
      icono: 'bi bi-exclamation-triangle',
      permiso: 'operar',
    } satisfies MenuItem]),
    {
      label: 'Datos Maestros',
      icono: 'bi bi-database',
      grupo: 'maestros',
      subItems: [
        { to: '/personal', label: 'Personal', icono: 'bi bi-people', end: true },
        { to: '/sectores', label: 'Sectores', icono: 'bi bi-diagram-3' },
        { to: '/tipos-documento', label: 'Tipo Documento', icono: 'bi bi-file-earmark-text' },
        { to: '/tipos-incidente', label: 'Tipo Incidente', icono: 'bi bi-exclamation-triangle-fill' },
        { to: '/equipos', label: 'Equipos e Instrumentos', icono: 'bi bi-tools' },
        { to: '/insumos', label: 'Insumos / Ingredientes', icono: 'bi bi-box-seam', end: true },
        { to: '/insumos-quimicos', label: 'Insumos Químicos', icono: 'bi bi-droplet-half' },
        { to: '/productos', label: 'Productos', icono: 'bi bi-basket' },
        { to: '/unidades-medida', label: 'Unidad de Medida', icono: 'bi bi-rulers' },
        { to: '/elementos', label: 'Elementos de Limpieza', icono: 'bi bi-bucket-fill' },
        { to: '/tarea', label: 'Tareas', icono: 'bi bi-list-task' },
      ],
    },
  ];

  const puedeVer = (permiso: Permiso = 'administrar') =>
    permiso === 'consultarOperacion'
      ? currentUser?.operar === true || currentUser?.administrar === true
      : permiso === 'operar' ? currentUser?.operar === true : currentUser?.administrar === true;

  const menuVisible = menuItems
    .map((item) =>
      item.subItems ? { ...item, subItems: item.subItems.filter((sub) => puedeVer(sub.permiso)) } : item
    )
    .filter((item) => (item.subItems ? item.subItems.length > 0 : puedeVer(item.permiso)));

  const instanceId = useId();
  const secciones = [
    { id: 'gestion', label: 'Gestión', icono: 'bi bi-graph-up', rutas: ['/tablero', '/vista-publica/configuracion'] },
    { id: 'operacion', label: 'Operación', icono: 'bi bi-clipboard2-check', rutas: ['/checklist', '/planes', '/lotes-produccion', '/reportes/consumos', '/consumos'] },
    { id: 'control', label: 'Control y seguimiento', icono: 'bi bi-shield-check', rutas: ['/vencimientos', '/incidentes', '/auditoria', '/lotes'] },
    { id: 'documentacion', label: 'Documentación', icono: 'bi bi-files', rutas: ['/documentos-vigentes', '/documentos-tecnicos'] },
  ].map((seccion) => ({
    ...seccion,
    items: seccion.rutas.flatMap((ruta): MenuItem[] => {
      if (ruta === '/incidentes') {
        const incidentes = menuVisible.find((item) => item.grupo === 'incidentes');
        if (incidentes?.subItems) {
          return incidentes.subItems.map((item) => ({
            ...item,
            label: item.to === '/incidentes/abiertos' ? 'Incidentes abiertos' : item.label,
          }));
        }
      }
      return menuVisible.filter((item) => item.to === ruta);
    }),
  })).filter((seccion) => seccion.items.length > 0);

  const maestros = menuVisible.find((item) => item.grupo === 'maestros');
  const grupos = [
    ...secciones,
    ...(maestros?.subItems?.length ? [{
      id: 'maestros', label: 'Datos maestros', icono: maestros.icono, items: maestros.subItems,
    }] : []),
  ];
  const esRutaActiva = (item: MenuItem) => Boolean(item.to && (
    location.pathname === item.to || (!item.end && location.pathname.startsWith(`${item.to}/`))
  ));
  const grupoActivo = grupos.find((grupo) => grupo.items.some(esRutaActiva))?.id;
  const [expansion, setExpansion] = useState<{ pathname: string; grupo: string | null } | null>(null);
  const grupoAbierto = expansion?.pathname === location.pathname
    ? expansion.grupo
    : grupoActivo ?? null;
  const accesos = ['/checklist', '/vencimientos', '/tablero']
    .flatMap((ruta) => menuVisible.filter((item) => item.to === ruta));
  const inicio = menuVisible.find((item) => item.to === '/inicio');
  const rol = currentUser?.administrar
    ? currentUser.operar ? 'Administración y operación' : 'Administración'
    : currentUser?.operar ? 'Operación' : 'Sin permisos';
  const iniciales = `${currentUser?.nombre?.charAt(0) ?? ''}${currentUser?.apellido?.charAt(0) ?? ''}`;

  const renderEnlace = (item: MenuItem, secundario = false) => item.to && (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-wrap ${secundario ? 'small' : 'fw-medium'} ${
          isActive ? 'bg-primary-subtle text-primary-emphasis' : 'text-body-secondary hover-bg-body'
        }`
      }
      style={{ minHeight: '44px' }}
    >
      {!secundario && <i className={`${item.icono} flex-shrink-0 fs-5`} aria-hidden="true" />}
      <span>{item.label}</span>
    </NavLink>
  );

  const renderGrupo = (grupo: typeof grupos[number], superficie: string) => {
    const abierto = grupoAbierto === grupo.id;
    const collapseId = `${instanceId}-${superficie}-${grupo.id}`;
    return (
      <div key={grupo.id}>
        <button
          type="button"
          onClick={() => setExpansion({ pathname: location.pathname, grupo: abierto ? null : grupo.id })}
          className={`nav-link w-100 border-0 d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-start fw-medium hover-bg-body ${
            grupoActivo === grupo.id ? 'text-body' : 'text-body-secondary'
          }`}
          style={{ minHeight: '44px' }}
          aria-controls={collapseId}
          aria-expanded={abierto}
        >
          <i className={`${grupo.icono} flex-shrink-0 fs-5`} aria-hidden="true" />
          <span className="flex-grow-1">{grupo.label}</span>
          <i className={`bi ${abierto ? 'bi-chevron-down' : 'bi-chevron-right'} small`} aria-hidden="true" />
        </button>
        <Collapse in={abierto}>
          <div id={collapseId}>
            <div className="d-flex flex-column gap-1 border-start ms-4 ps-2 my-1">
              {grupo.items.map((item) => renderEnlace(item, true))}
            </div>
          </div>
        </Collapse>
      </div>
    );
  };

  const renderMenu = (superficie: string) => (
    <>
      <div className="px-4 pt-4 pb-3">
        <span className="fs-5 fw-bold text-body tracking-tight">SAIA</span>
      </div>
      {currentUser && (
        <div className="mx-3 p-3 bg-body-tertiary rounded-3 mb-3 d-flex align-items-center gap-2">
          <span className="rounded-circle border d-flex align-items-center justify-content-center small flex-shrink-0"
            style={{ width: '34px', height: '34px' }} aria-hidden="true">{iniciales}</span>
          <div style={{ minWidth: 0 }}>
            <span className="fw-semibold d-block text-break small">{currentUser.nombre} {currentUser.apellido}</span>
            <span className="text-body-secondary small">{rol}</span>
          </div>
        </div>
      )}
      <nav aria-label="Navegación principal" className="nav nav-pills flex-column px-3 gap-1 mb-auto pb-3">
        {inicio && renderEnlace(inicio)}
        {accesos.length > 0 && (
          <>
            <div className="text-uppercase text-body-secondary small fw-semibold px-3 mt-3 mb-1">Accesos frecuentes</div>
            {accesos.map((item) => renderEnlace(item))}
          </>
        )}
        {secciones.length > 0 && (
          <>
            <div className="text-uppercase text-body-secondary small fw-semibold px-3 mt-3 mb-1">Todas las secciones</div>
            {secciones.map((grupo) => renderGrupo(grupo, superficie))}
          </>
        )}
        {maestros && (
          <>
            <div className="text-uppercase text-body-secondary small fw-semibold px-3 mt-3 mb-1">Administración</div>
            {grupos.filter((grupo) => grupo.id === 'maestros').map((grupo) => renderGrupo(grupo, superficie))}
          </>
        )}
      </nav>
    </>
  );

  return (
    <>
      <aside
        className="position-fixed top-0 start-0 bottom-0 bg-body border-end d-none d-md-flex flex-column z-3 shadow-sm overflow-auto"
        style={{ width: '260px' }}
      >
        {renderMenu('desktop')}
      </aside>

      <Offcanvas show={show} onHide={onClose} placement="start" className="d-md-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Menú</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="d-flex flex-column p-0">{renderMenu('mobile')}</Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

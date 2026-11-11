import { useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Offcanvas, Collapse } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  show: boolean;
  onClose: () => void;
}

type Permiso = 'operar' | 'administrar' | 'consultarOperacion';

type GrupoMaestro = 'maestrosProduccion' | 'maestrosLimpieza' | 'maestrosGenerales';

interface MenuItem {
  to?: string;
  end?: boolean;
  label: string;
  icono: string;
  permiso?: Permiso;
  grupo?: 'incidentes' | GrupoMaestro;
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
    { to: '/recepciones-insumos', label: 'Recepción de insumos', icono: 'bi bi-box-arrow-in-down', permiso: 'administrar' },
    { to: '/vista-publica/configuracion', label: 'Vista pública', icono: 'bi bi-globe', permiso: 'administrar'},
    { to: '/tablero', label: 'Tablero de gestión', icono: 'bi bi-graph-up' },
    { to: '/planes', label: 'Planes de Limpieza', icono: 'bi bi-clipboard2-check' },
    { to: '/auditoria', label: 'Historial Checklist', icono: 'bi bi-clock-history' },
    { to: '/lotes', label: 'Historial de lotes', icono: 'bi bi-box-seam' },
    { to: '/trazabilidad-insumos', label: 'Trazabilidad de insumos', icono: 'bi bi-upc-scan', permiso: 'administrar' },
    { to: '/checklist', label: 'Checklist del Día', icono: 'bi bi-check2-square', permiso: 'operar' },
    { to: '/registro-temperatura', label: 'Control de Frío', icono: 'bi bi-thermometer-half', permiso: 'operar' },
    { to: '/reportes/consumos', label: 'Consumo de Insumos Químicos', icono: 'bi bi-bar-chart-line' },
    { to: "/consumos", label: "Registros de Consumo", icono: "bi bi-droplet" },
    { to: '/recetas', label: 'Recetas', icono: 'bi bi-journal-bookmark', permiso: 'consultarOperacion' },
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
      label: 'Maestros de producción',
      icono: 'bi bi-basket',
      grupo: 'maestrosProduccion',
      subItems: [
        { to: '/productos', label: 'Productos', icono: 'bi bi-basket' },
        { to: '/insumos', label: 'Insumos / Ingredientes', icono: 'bi bi-box-seam', end: true },
        { to: '/proveedores', label: 'Proveedores', icono: 'bi bi-truck', permiso: 'administrar' },
      ],
    },
    {
      label: 'Maestros de limpieza',
      icono: 'bi bi-bucket',
      grupo: 'maestrosLimpieza',
      subItems: [
        { to: '/tarea', label: 'Tareas', icono: 'bi bi-list-task' },
        { to: '/elementos', label: 'Elementos de Limpieza', icono: 'bi bi-bucket-fill' },
        { to: '/insumos-quimicos', label: 'Insumos Químicos', icono: 'bi bi-droplet-half' },
      ],
    },
    {
      label: 'Maestros generales',
      icono: 'bi bi-database',
      grupo: 'maestrosGenerales',
      subItems: [
        { to: '/personal', label: 'Personal', icono: 'bi bi-people', end: true },
        { to: '/sectores', label: 'Sectores', icono: 'bi bi-diagram-3' },
        { to: '/equipos', label: 'Equipos e Instrumentos', icono: 'bi bi-tools' },
        { to: '/unidades-medida', label: 'Unidad de Medida', icono: 'bi bi-rulers' },
        { to: '/tipos-documento', label: 'Tipo Documento', icono: 'bi bi-file-earmark-text' },
        { to: '/tipos-incidente', label: 'Tipo Incidente', icono: 'bi bi-exclamation-triangle-fill' },
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
    { id: 'produccion', label: 'Producción', icono: 'bi bi-basket2', rutas: ['/recetas', '/lotes-produccion', '/recepciones-insumos', '/lotes', '/trazabilidad-insumos'] },
    { id: 'limpieza', label: 'Limpieza', icono: 'bi bi-clipboard2-check', rutas: ['/checklist', '/planes', '/auditoria', '/consumos', '/reportes/consumos'] },
    { id: 'control', label: 'Control y seguimiento', icono: 'bi bi-shield-check', rutas: ['/registro-temperatura', '/vencimientos', '/incidentes'] },
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

  const gruposMaestros: GrupoMaestro[] = ['maestrosProduccion', 'maestrosLimpieza', 'maestrosGenerales'];
  const maestros = gruposMaestros.flatMap((grupo) => {
    const item = menuVisible.find((menu) => menu.grupo === grupo);
    return item?.subItems?.length
      ? [{ id: grupo, label: item.label, icono: item.icono, items: item.subItems as MenuItem[] }]
      : [];
  });
  const grupos = [...secciones, ...maestros];
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
  const renderEnlace = (item: MenuItem) => item.to && (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        `nav-link sidebar-nav-item d-flex align-items-center gap-2 px-2 py-2 rounded-3 text-wrap ${
          isActive ? 'sidebar-nav-selected' : 'text-body-secondary hover-bg-body'
        }`
      }
      style={{ minHeight: '44px' }}
    >
      <i className={`${item.icono} sidebar-nav-icon flex-shrink-0`} aria-hidden="true" />
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
          className={`nav-link sidebar-nav-item w-100 border-0 d-flex align-items-center gap-2 px-2 py-2 rounded-3 text-start hover-bg-body ${
            grupoActivo === grupo.id ? 'text-body' : 'text-body-secondary'
          }`}
          style={{ minHeight: '44px' }}
          aria-controls={collapseId}
          aria-expanded={abierto}
        >
          <i className={`${grupo.icono} sidebar-nav-icon flex-shrink-0`} aria-hidden="true" />
          <span className="flex-grow-1">{grupo.label}</span>
          <i className={`bi ${abierto ? 'bi-chevron-up' : 'bi-chevron-down'} sidebar-nav-chevron flex-shrink-0`} aria-hidden="true" />
        </button>
        <Collapse in={abierto}>
          <div id={collapseId}>
            <div className="d-flex flex-column gap-1 border-start ms-4 ps-2 my-1">
              {grupo.items.map((item) => renderEnlace(item))}
            </div>
          </div>
        </Collapse>
      </div>
    );
  };

  const renderMenu = (superficie: string) => (
    <>
      <div className="flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
        <div className="px-4 pt-4 pb-3 d-flex align-items-center gap-3">
          <span
            className="navigation-brand-accent rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: '42px', height: '46px' }}
            aria-hidden="true"
          >
            {/* Lucide wheat: https://lucide.dev/icons/wheat (ISC).
                Copyright (c) 2026 Lucide Icons and Contributors
                Permission to use, copy, modify, and/or distribute this software for any
                purpose with or without fee is hereby granted, provided that the above
                copyright notice and this permission notice appear in all copies.
                THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
                WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
                MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
                ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
                WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
                ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
                OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              focusable="false"
            >
              <path d="M2 22 16 8" />
              <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
              <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
              <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
              <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
              <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
              <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
              <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
            </svg>
          </span>
          <div>
            <span className="fs-4 fw-bold text-body d-block">SAIA</span>
            <span className="small text-body-secondary">Gestión alimentaria</span>
          </div>
        </div>
        {currentUser && (
          <div className="mx-3 px-2 py-3 border rounded-3 mb-3 d-flex align-items-start gap-2">
            <i className="bi bi-shop text-body-secondary flex-shrink-0" aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <span className="d-block text-break small">Nuestro establecimiento</span>
              <span className="text-body-secondary small">
                {currentUser.administrar ? 'Panel de administración' : currentUser.operar ? 'Panel de operación' : 'Acceso al sistema'}
              </span>
            </div>
          </div>
        )}
        <nav aria-label="Navegación principal" className="sidebar-navigation nav nav-pills flex-column px-3 gap-1 mb-auto pb-3">
          {inicio && renderEnlace(inicio)}
          {accesos.length > 0 && (
            <>
              <div className="sidebar-nav-heading text-uppercase text-body-secondary px-2 mt-3 mb-1">Accesos frecuentes</div>
              {accesos.map((item) => renderEnlace(item))}
            </>
          )}
          {grupos.length > 0 && (
            <>
              <div className="sidebar-nav-heading text-uppercase text-body-secondary px-2 mt-3 mb-1">Todas las secciones</div>
              {grupos.map((grupo) => renderGrupo(grupo, superficie))}
            </>
          )}
        </nav>
      </div>
      <div className="saia-sidebar-footer text-body-secondary">
        <i className="bi bi-shield-check saia-footer-icon" aria-hidden="true" />
        <div className="saia-footer-identity">
          <span className="saia-footer-role">
            {currentUser?.administrar ? 'Administración' : currentUser?.operar ? 'Operación' : 'Sin permisos'}
          </span>
          <span className="saia-footer-description">Acceso interno del establecimiento</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="position-fixed top-0 start-0 bottom-0 bg-body border-end d-none d-md-flex flex-column z-3 shadow-sm overflow-hidden"
        style={{ width: '260px' }}
      >
        {renderMenu('desktop')}
      </aside>

      <Offcanvas show={show} onHide={onClose} placement="start" className="d-md-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Menú</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="d-flex flex-column p-0 overflow-hidden">{renderMenu('mobile')}</Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

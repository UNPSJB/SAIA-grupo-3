import { homeFor, permissions } from '../libreria/permissions';
import { useState, useEffect } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { NotificacionesBell } from '../../features/notificaciones';
import { aplicarTema, leerTema, type Tema } from '../libreria/tema';
import { Link, useLocation } from 'react-router-dom';

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

// Solo etiquetas de navegación: las rutas y sus permisos se definen en el router.
const rutasNavegacion = [
  { ruta: '/inicio', titulo: 'Administración' },
  { ruta: '/perfil', titulo: 'Mi perfil' },
  { ruta: '/sin-permisos', titulo: 'Sin permisos' },
  { ruta: '/tablero', titulo: 'Tablero de gestión', seccion: 'Gestión' },
  { ruta: '/vista-publica/configuracion', titulo: 'Vista pública', seccion: 'Gestión' },
  { ruta: '/checklist', titulo: 'Checklist del día', seccion: 'Operación' },
  { ruta: '/planes', titulo: 'Planes de limpieza', seccion: 'Operación' },
  { ruta: '/lotes-produccion', titulo: 'Lotes de producción', seccion: 'Operación' },
  { ruta: '/recepciones-insumos', titulo: 'Recepción de insumos', seccion: 'Operación' },
  { ruta: '/reportes/consumos', titulo: 'Consumo de insumos químicos', seccion: 'Operación' },
  { ruta: '/consumos', titulo: 'Registros de consumo', seccion: 'Operación' },
  { ruta: '/vencimientos/calibracion', titulo: 'Vencimientos de calibración', seccion: 'Control y seguimiento' },
  { ruta: '/vencimientos', titulo: 'Vencimientos', seccion: 'Control y seguimiento' },
  { ruta: '/personal/vencimientos', titulo: 'Vencimientos del personal', seccion: 'Control y seguimiento' },
  { ruta: '/incidentes/abiertos', titulo: 'Incidentes abiertos', seccion: 'Control y seguimiento' },
  { ruta: '/incidentes', titulo: 'Incidentes', seccion: 'Control y seguimiento' },
  { ruta: '/auditoria', titulo: 'Historial checklist', seccion: 'Control y seguimiento' },
  { ruta: '/lotes', titulo: 'Historial de lotes', seccion: 'Control y seguimiento' },
  { ruta: '/trazabilidad-insumos', titulo: 'Trazabilidad de insumos', seccion: 'Control y seguimiento' },
  { ruta: '/documentos-vigentes', titulo: 'Documentos vigentes', seccion: 'Documentación' },
  { ruta: '/documentos-tecnicos', titulo: 'Documentos técnicos', seccion: 'Documentación' },
  { ruta: '/personal', titulo: 'Personal', seccion: 'Datos maestros' },
  { ruta: '/proveedores', titulo: 'Proveedores', seccion: 'Datos maestros' },
  { ruta: '/sectores', titulo: 'Sectores', seccion: 'Datos maestros' },
  { ruta: '/tipos-documento', titulo: 'Tipo de documento', seccion: 'Datos maestros' },
  { ruta: '/tipos-incidente', titulo: 'Tipo de incidente', seccion: 'Datos maestros' },
  { ruta: '/equipos', titulo: 'Equipos e instrumentos', seccion: 'Datos maestros' },
  { ruta: '/insumos', titulo: 'Insumos / ingredientes', seccion: 'Datos maestros' },
  { ruta: '/insumos-quimicos', titulo: 'Insumos químicos', seccion: 'Datos maestros' },
  { ruta: '/productos', titulo: 'Productos', seccion: 'Datos maestros' },
  { ruta: '/unidades-medida', titulo: 'Unidades de medida', seccion: 'Datos maestros' },
  { ruta: '/elementos', titulo: 'Elementos de limpieza', seccion: 'Datos maestros' },
  { ruta: '/tarea', titulo: 'Tareas', seccion: 'Datos maestros' },
].sort((a, b) => b.ruta.length - a.ruta.length);

const etiquetasAccion: Record<string, string> = {
  nuevo: 'Nuevo', editar: 'Editar', edit: 'Editar', modificar: 'Modificar',
  eliminar: 'Dar de baja', delete: 'Dar de baja', baja: 'Dar de baja',
  reactivar: 'Reactivar', ver: 'Detalle', view: 'Detalle',
};

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { currentUser, logout } = useAuth();
  const { pathname } = useLocation();
  const esInicio = pathname === '/inicio';
  const rutaActual = rutasNavegacion.find(
    ({ ruta }) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
  const segmentoFinal = rutaActual
    ? pathname.slice(rutaActual.ruta.length).split('/').filter(Boolean).at(-1)
    : undefined;
  const accionActual = segmentoFinal ? etiquetasAccion[segmentoFinal] ?? 'Detalle' : undefined;
  const iniciales = `${currentUser?.nombre?.charAt(0) ?? ''}${currentUser?.apellido?.charAt(0) ?? ''}`;
  const rol = currentUser?.administrar
    ? 'Administración'
    : currentUser?.operar ? 'Operación' : 'Sin permisos';
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [tema, setTema] = useState<Tema>(() =>
    document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : leerTema(),
  );

  // Aplicamos el atributo a <html> cada vez que cambia el tema y lo guardamos
  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  const cambiarTema = () => {
    setTema((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const cerrarSesion = async () => {
    setCerrandoSesion(true);
    try {
      await logout();
    } finally {
      setCerrandoSesion(false);
    }
  };

  return (
    <header
      className="position-fixed top-0 end-0 bg-body border-bottom px-3 px-md-4 d-flex align-items-center justify-content-between z-2 shadow-xs top-header"
      style={{ height: '64px' }}
    >
      <Button
        variant="outline-secondary"
        className="d-md-none border-0 bg-body text-body"
        onClick={onToggleSidebar}
        aria-label="Abrir menú"
      >
        <i className="bi bi-list fs-3 text-secondary"></i>
      </Button>

      <nav aria-label="Ruta de navegación" className="small me-2 overflow-hidden" style={{ minWidth: 0 }}>
        <ol className="breadcrumb mb-0 flex-nowrap align-items-center">
          <li className="breadcrumb-item flex-shrink-0">
            <Link to={homeFor(currentUser)} className="text-body-secondary" aria-label="Inicio">
              <i className="bi bi-house-door" aria-hidden="true" />
            </Link>
          </li>
          {rutaActual?.seccion && (
            <li className="breadcrumb-item text-body-secondary d-none d-lg-block flex-shrink-0">
              {rutaActual.seccion}
            </li>
          )}
          <li className={`breadcrumb-item text-truncate ${accionActual ? '' : 'active'}`} aria-current={accionActual ? undefined : 'page'}>
            {accionActual && rutaActual ? (
              <Link to={rutaActual.ruta} className="text-body-secondary text-decoration-none">
                {rutaActual.titulo}
              </Link>
            ) : rutaActual?.titulo ?? 'Página no encontrada'}
          </li>
          {accionActual && (
            <li className="breadcrumb-item active flex-shrink-0" aria-current="page">{accionActual}</li>
          )}
        </ol>
      </nav>

      <div className="ms-auto d-flex align-items-center gap-2 gap-md-3 flex-shrink-0">
        {/* Botón para alternar modo claro / oscuro */}

        {esInicio && (
          <span className="d-none d-lg-inline small text-body-secondary me-2">
            {new Date().toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}

        <Button
          variant="outline-secondary"
          onClick={cambiarTema}
          className="header-icon-button d-flex align-items-center justify-content-center rounded-2 p-0 shadow-none"
          title={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <i
            className={`bi ${tema === 'dark' ? 'bi-brightness-high' : 'bi-moon-stars'}`}
            aria-hidden="true"
          ></i>
        </Button>
        {permissions(currentUser).canAdmin && <NotificacionesBell />}
        {currentUser && (
          <Dropdown align="end" className="border-start ps-2 ps-md-3 ms-1">
            <Dropdown.Toggle
              id="menu-cuenta"
              variant="outline-secondary"
              className="avatar-toggle d-flex align-items-center gap-2 border-0 bg-transparent text-body p-0 shadow-none"
              aria-label="Abrir menú de cuenta"
              title={`${currentUser.nombre} ${currentUser.apellido}`}
            >
              <span
                className="navigation-account-accent rounded-circle border d-flex align-items-center justify-content-center small flex-shrink-0"
                style={{ width: '36px', height: '36px' }}
                aria-hidden="true"
              >
                {iniciales}
              </span>
              <span className="d-none d-lg-block text-start small">
                <span className="d-block">{currentUser.nombre} {currentUser.apellido}</span>
                <span className="d-block text-body-secondary">{rol}</span>
              </span>
              <i className="bi bi-chevron-down small d-none d-md-inline" aria-hidden="true" />
            </Dropdown.Toggle>
            <Dropdown.Menu className="cuenta-menu p-2 shadow-sm">
              <Dropdown.Header className="cuenta-menu-identidad d-flex align-items-center gap-3 text-body">
                <span className="navigation-account-accent cuenta-menu-avatar" aria-hidden="true">
                  {iniciales}
                </span>
                <div style={{ minWidth: 0 }}>
                  <span className="d-block fw-medium text-break">
                    {currentUser.nombre} {currentUser.apellido}
                  </span>
                  <span className="d-block small text-body-secondary mt-1">{rol}</span>
                </div>
              </Dropdown.Header>
              <Dropdown.Divider className="mx-2 mt-0 mb-2" />
              <Dropdown.Item as={Link} to="/perfil" active={pathname === '/perfil'} className="cuenta-menu-item">
                <i className="bi bi-person-circle" aria-hidden="true" />
                Mi perfil
              </Dropdown.Item>
              <Dropdown.Divider className="mx-2 my-2" />
              <Dropdown.Item
                as="button"
                className="cuenta-menu-item cuenta-menu-salir"
                disabled={cerrandoSesion}
                onClick={() => void cerrarSesion()}
              >
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                {cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>
    </header>
  );
}

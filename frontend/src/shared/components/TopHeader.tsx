import { permissions } from '../libreria/permissions';
import { useState, useEffect } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { NotificacionesBell } from '../../features/notificaciones';
import { aplicarTema, leerTema, type Tema } from '../libreria/tema';

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { currentUser, logout } = useAuth();
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

      <div className="ms-auto d-flex align-items-center gap-2">
        {/* Botón para alternar modo claro / oscuro */}
        <Button
          variant="outline-secondary"
          onClick={cambiarTema}
          className="header-icon-button d-flex align-items-center justify-content-center rounded-circle p-0 shadow-none"
          title={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <i
            className={`bi ${tema === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}
            aria-hidden="true"
          ></i>
        </Button>
        {permissions(currentUser).canAdmin && <NotificacionesBell />}
        {currentUser && (
          <Dropdown align="end">
            <Dropdown.Toggle
              id="menu-cuenta"
              variant="outline-secondary"
              className="header-icon-button avatar-toggle d-flex align-items-center justify-content-center rounded-circle p-0 shadow-none"
              aria-label="Abrir menú de cuenta"
              title={`${currentUser.nombre} ${currentUser.apellido}`}
            >
              <i className="bi bi-person-fill" aria-hidden="true" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item
                as="button"
                className="text-danger"
                disabled={cerrandoSesion}
                onClick={() => void cerrarSesion()}
              >
                <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
                {cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>
    </header>
  );
}

import { Dropdown, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotificaciones } from './useNotificaciones';
import type { Notificacion } from './types';
import { formatearFechaHora } from '../../shared/libreria/fechas';

export function NotificacionesBell() {
  const navigate = useNavigate();
  const { notificaciones, cantidadNoLeidas, error, recargar, marcarLeida, marcarTodas } =
    useNotificaciones();

  const abrirNotificacion = (n: Notificacion) => {
    if (n.enlace) navigate(n.enlace);
    if (!n.leida)
      marcarLeida(n.id).catch(() => {
        /* no bloquea la navegación */
      });
  };

  return (
    <Dropdown
      align="end"
      onToggle={(abierto) => {
        if (abierto) recargar();
      }}
    >
      <Dropdown.Toggle
        variant="outline-secondary"
        className="header-icon-button campanita-toggle position-relative d-flex align-items-center justify-content-center rounded-2 p-0 shadow-none"
        aria-label={`Notificaciones: ${cantidadNoLeidas} sin leer`}
        title="Notificaciones"
      >
        <i
          className="bi bi-bell"
          aria-hidden="true"
        ></i>
        {cantidadNoLeidas > 0 && (
          <span className="notification-count" aria-hidden="true">
            {cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}
          </span>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notificaciones-menu shadow-sm p-0">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-bell text-body-secondary" aria-hidden="true" />
            <strong className="small fw-medium">Notificaciones</strong>
            <span className="notificaciones-contador">{cantidadNoLeidas} sin leer</span>
          </div>
          {cantidadNoLeidas > 0 && (
            <Button
              variant="link"
              size="sm"
              className="notificaciones-marcar p-0 text-decoration-none"
              onClick={marcarTodas}
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <div className="notificaciones-lista p-2">
          {error ? (
            <div className="text-danger small p-3" role="alert">{error}</div>
          ) : notificaciones.length === 0 ? (
            <div className="text-muted small text-center p-4">
              <i className="bi bi-bell-slash d-block fs-4 mb-2" aria-hidden="true"></i>
              No hay notificaciones
            </div>
          ) : (
            notificaciones.map((n) => (
              <Dropdown.Item
                key={n.id}
                as="button"
                onClick={() => abrirNotificacion(n)}
                className={`notificacion-item d-flex gap-3 p-3 text-wrap rounded-3 ${n.leida ? '' : 'notificacion-sin-leer'}`}
              >
                <span className="notificacion-icono flex-shrink-0" aria-hidden="true">
                  <i className={`bi ${n.tipo === 'temperatura_fuera_rango' ? 'bi-thermometer-half' : n.tipo === 'stock_bajo' ? 'bi-box-seam' : 'bi-calendar2-event'}`} />
                </span>
                <div className="flex-grow-1 small" style={{ minWidth: 0 }}>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <span className="fw-medium">{n.titulo}</span>
                    {!n.leida && <span className="notificacion-punto" aria-hidden="true" />}
                  </div>
                  <div className="text-body-secondary mb-2">{n.mensaje}</div>
                  <small className="text-body-secondary">
                    {n.resuelta ? 'Resuelta' : n.leida ? 'Leída' : 'Sin leer'}
                    {' · '}{formatearFechaHora(n.fecha_creacion)}
                  </small>
                </div>
                {n.enlace && <i className="bi bi-chevron-right small text-body-secondary align-self-center flex-shrink-0" aria-hidden="true" />}
              </Dropdown.Item>
            ))
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

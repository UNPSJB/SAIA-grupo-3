import { Dropdown, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotificaciones } from './useNotificaciones';
import type { Notificacion } from './types';

function formatearFecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
        className="header-icon-button campanita-toggle position-relative d-flex align-items-center justify-content-center rounded-circle p-0 shadow-none"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <i
          className={`bi ${cantidadNoLeidas > 0 ? 'bi-bell-fill' : 'bi-bell'}`}
          aria-hidden="true"
        ></i>
        {cantidadNoLeidas > 0 && (
          <Badge bg="danger" pill className="notification-count">
            {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow p-0" style={{ width: '340px' }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <strong className="small">Notificaciones</strong>
          {cantidadNoLeidas > 0 && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none"
              onClick={marcarTodas}
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {error ? (
            <div className="text-danger small p-3">{error}</div>
          ) : notificaciones.length === 0 ? (
            <div className="text-muted small text-center p-4">
              <i className="bi bi-bell-slash d-block fs-4 mb-1"></i>
              No hay notificaciones
            </div>
          ) : (
            notificaciones.map((n) => (
              <Dropdown.Item
                key={n.id}
                as="button"
                onClick={() => abrirNotificacion(n)}
                className={`d-flex gap-2 px-3 py-2 border-bottom text-wrap ${n.leida ? '' : 'bg-primary-subtle'}`}
              >
                <i className="bi bi-exclamation-triangle-fill text-warning mt-1"></i>
                <div className="flex-grow-1 small">
                  <div className="fw-semibold">{n.titulo}</div>
                  <div className="text-body-secondary">{n.mensaje}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {formatearFecha(n.fecha_creacion)}
                  </div>
                </div>
                {n.enlace && <i className="bi bi-chevron-right text-muted align-self-center"></i>}
              </Dropdown.Item>
            ))
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Modal,
  Row,
} from 'react-bootstrap';
import { INDICADORES_PUBLICOS } from '../vistaPublica/indicadoresPublicos';
import { Link } from 'react-router-dom';

import { useAuth } from '../../shared/hooks/useAuth';
import { useConsulta } from '../../shared/hooks/useConsulta';
import {
  fechaHoyIso,
  formatearFecha,
  sumarDias,
} from '../../shared/libreria/fechas';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

import { getCumplimientoChecklist } from '../tablero/tableroApi';
import { getVencimientosConsolidados } from '../vencimientos/vencimientosApi';
import {
  getConfiguracionPublica,
  getPrevisualizacion,
} from '../vistaPublica/vistaPublicaApi';
import { VistaPublicaContenido } from '../vistaPublica/VistaPublicaContenido';

function saludoActual(): string {
  const hora = new Date().getHours();

  if (hora < 12) return 'Buen día';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 1,
  }).format(valor);
}

export function InicioAdminPage() {
  const { currentUser } = useAuth();
  const [mostrarVista, setMostrarVista] = useState(false);

  // Treinta días completos, sin incluir el día en curso.
  const hoy = fechaHoyIso();
  const hasta = sumarDias(hoy, -1);
  const desde = sumarDias(hasta, -29);

  const cumplimiento = useConsulta(
    () => getCumplimientoChecklist(desde, hasta, 'dia'),
    [desde, hasta],
  );

  const vencimientos = useConsulta(
    () =>
      getVencimientosConsolidados(
        1,
        1,
        'todos',
        '',
        true,
        '',
        'fecha_vencimiento',
        'asc',
      ),
    [hoy],
  );

  const publicacion = useConsulta(getConfiguracionPublica, []);

  const configuracion = publicacion.datos;

  const cargando =
    cumplimiento.cargando ||
    vencimientos.cargando ||
    publicacion.cargando;

  const porcentaje = cumplimiento.datos?.porcentaje;

  const textoCumplimiento = cumplimiento.cargando
    ? '…'
    : cumplimiento.error
      ? '—'
      : porcentaje === null || porcentaje === undefined
        ? 'Sin datos'
        : `${formatearNumero(porcentaje)} %`;

  const textoTareas = cumplimiento.cargando
    ? '…'
    : cumplimiento.error || !cumplimiento.datos
      ? '—'
      : formatearNumero(cumplimiento.datos.realizadas);

  const textoVencimientos = vencimientos.cargando
    ? '…'
    : vencimientos.error || !vencimientos.datos
      ? '—'
      : formatearNumero(vencimientos.datos.total);

  const estadoPublicacion = publicacion.cargando
    ? 'Consultando...'
    : publicacion.error || !configuracion
      ? 'No disponible'
      : configuracion.activa
        ? 'Activa'
        : 'Desactivada';

  const publicacionConocida =
    !publicacion.cargando &&
    !publicacion.error &&
    configuracion !== null;

  function actualizarResumen() {
    cumplimiento.recargar();
    vencimientos.recargar();
    publicacion.recargar();
  }

  return (
    <div className="py-2 mx-auto" style={{ maxWidth: 1100 }}>
      <header className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h2 fw-semibold mb-2">
            {saludoActual()}, {currentUser?.nombre ?? 'administrador'}
          </h1>

          <p className="text-body-secondary mb-0">
            El resumen de tu establecimiento, en un solo lugar.
          </p>
        </div>

        <Button
          variant="outline-secondary"
          size="sm"
          disabled={cargando}
          onClick={actualizarResumen}
        >
          <i
            className="bi bi-arrow-clockwise me-2"
            aria-hidden="true"
          />
          Actualizar
        </Button>
      </header>

      <section aria-labelledby="inicio-resumen">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 id="inicio-resumen" className="h5 mb-0">
            Resumen de gestión
          </h2>

          <span className="small text-body-secondary">
            Checklist: {formatearFecha(desde)} al{' '}
            {formatearFecha(hasta)}
          </span>
        </div>

        {cumplimiento.error && (
          <Alert variant="danger">
            No se pudo cargar el cumplimiento del checklist:{' '}
            {cumplimiento.error}
          </Alert>
        )}

        {vencimientos.error && (
          <Alert variant="danger">
            No se pudieron cargar los vencimientos:{' '}
            {vencimientos.error}
          </Alert>
        )}

        <Row xs={1} xl={3} className="g-3">
          <Col>
            <Card className="h-100 shadow-sm">
              <Card.Body className="p-4">
                <h3 className="h6 text-body-secondary mb-0">
                  <i
                    className="bi bi-graph-up me-2"
                    aria-hidden="true"
                  />
                  Cumplimiento
                </h3>

                <p
                  className="fs-2 fw-semibold my-3"
                  aria-live="polite"
                >
                  {textoCumplimiento}
                </p>

                <Link
                  to="/tablero"
                  className="small text-decoration-none"
                >
                  Ver tablero
                  <i
                    className="bi bi-arrow-up-right ms-2"
                    aria-hidden="true"
                  />
                </Link>
              </Card.Body>
            </Card>
          </Col>

          <Col>
            <Card className="h-100 shadow-sm">
              <Card.Body className="p-4">
                <h3 className="h6 text-body-secondary mb-0">
                  <i
                    className="bi bi-clipboard-check me-2"
                    aria-hidden="true"
                  />
                  Tareas realizadas
                </h3>

                <p
                  className="fs-2 fw-semibold my-3"
                  aria-live="polite"
                >
                  {textoTareas}
                </p>

                <span className="small text-body-secondary">
                  En los últimos 30 días completos
                </span>
              </Card.Body>
            </Card>
          </Col>

          <Col>
            <Card className="h-100 shadow-sm">
              <Card.Body className="p-4">
                <h3 className="h6 text-body-secondary mb-0">
                  <i
                    className="bi bi-calendar-x me-2"
                    aria-hidden="true"
                  />
                  Vencidos y próximos
                </h3>

                <p
                  className="fs-2 fw-semibold my-3"
                  aria-live="polite"
                >
                  {textoVencimientos}
                </p>

                <Link
                  to="/vencimientos"
                  className="small text-decoration-none"
                >
                  Revisar vencimientos
                  <i
                    className="bi bi-arrow-up-right ms-2"
                    aria-hidden="true"
                  />
                </Link>

                <p className="small text-body-secondary mt-2 mb-0">
                  Documentación y calibración · Estado actual
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>

      <section
        className="mt-4"
        aria-labelledby="inicio-publicacion"
      >
        <h2 id="inicio-publicacion" className="h5 mb-3">
          Lo que compartís con tus clientes
        </h2>

        <Card className="shadow-sm">
          <Card.Body className="p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h3 className="h6 mb-0">
                <i className="bi bi-globe me-2" aria-hidden="true" />
                Vista Pública
              </h3>

              <Badge
                bg={
                  publicacionConocida && configuracion?.activa
                    ? 'success'
                    : 'secondary'
                }
              >
                {estadoPublicacion}
              </Badge>
            </div>

            {publicacion.error ? (
              <ErrorAlert mensaje={publicacion.error} />
            ) : (
              <p className="text-body-secondary mb-3">
                {!publicacionConocida
                  ? 'Consultando la configuración de la publicación...'
                  : configuracion.activa
                    ? 'Tu enlace público está disponible. Elegí qué indicadores pueden consultar los visitantes.'
                    : 'Tu información no está publicada. Podés elegir los indicadores y previsualizar antes de compartir.'}
              </p>
            )}

            <div className="d-flex flex-wrap gap-2">
              <Link
                to="/vista-publica/configuracion"
                className="btn btn-primary"
              >
                <i
                  className="bi bi-sliders me-2"
                  aria-hidden="true"
                />
                Configurar indicadores
              </Link>

              <Button
                variant="outline-secondary"
                onClick={() => setMostrarVista(true)}
                disabled={!publicacionConocida}
              >
                <i className="bi bi-eye me-2" aria-hidden="true" />
                Previsualizar
              </Button>
            </div>

            {publicacionConocida && (
              <p className="small text-body-secondary mt-3 mb-0">
                {configuracion.indicadores_habilitados.length} de{' '}
                {INDICADORES_PUBLICOS.length} indicadores seleccionados
              </p>
            )}
          </Card.Body>
        </Card>
      </section>

      <footer className="small text-body-secondary mt-4">
        <i className="bi bi-lock me-2" aria-hidden="true" />
        Información interna · Solo administración
      </footer>

      {mostrarVista && (
        <PrevisualizacionInicio
          onCerrar={() => setMostrarVista(false)}
        />
      )}
    </div>
  );
}

function PrevisualizacionInicio({
  onCerrar,
}: {
  onCerrar: () => void;
}) {
  const consulta = useConsulta(getPrevisualizacion, []);

  return (
    <Modal
      show
      onHide={onCerrar}
      size="lg"
      fullscreen="md-down"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Previsualización de la Vista Pública</Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <Alert variant="secondary">
          Esta previsualización es privada y no activa la publicación.
        </Alert>

        {consulta.cargando ? (
          <LoadingSpinner mensaje="Cargando indicadores..." />
        ) : consulta.error ? (
          <>
            <ErrorAlert mensaje={consulta.error} />
            <Button
              variant="outline-secondary"
              onClick={consulta.recargar}
            >
              Reintentar
            </Button>
          </>
        ) : consulta.datos ? (
          <VistaPublicaContenido datos={consulta.datos} />
        ) : null}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
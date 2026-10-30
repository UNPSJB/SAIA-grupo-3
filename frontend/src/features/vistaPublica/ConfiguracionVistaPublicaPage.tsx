import { useRef, useState } from 'react';
import { INDICADORES_PUBLICOS } from './indicadoresPublicos';
import { QRCodeSVG } from 'qrcode.react';
import {
  Alert,
  Button,
  Card,
  Container,
  Form,
  Modal,
} from 'react-bootstrap';

import { useConsulta } from '../../shared/hooks/useConsulta';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

import {
  cambiarEstadoPublicacion,
  cambiarIndicador,
  getConfiguracionPublica,
  getPrevisualizacion,
  type CodigoIndicador,
  type VistaPublicaDatos,
} from './vistaPublicaApi';

import { VistaPublicaContenido } from './VistaPublicaContenido';

const OPCIONES = INDICADORES_PUBLICOS;

export function ConfiguracionVistaPublicaPage() {
  const consulta = useConsulta(getConfiguracionPublica, []);

  const bloqueo = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [mostrarVista, setMostrarVista] = useState(false);
  const [cargandoVista, setCargandoVista] = useState(false);
  const [vista, setVista] = useState<VistaPublicaDatos | null>(null);
  const [errorVista, setErrorVista] = useState<string | null>(null);

  const configuracion = consulta.datos;

  const ocupado =
    consulta.cargando || guardando || cargandoVista;

  const enlacePublico =
    configuracion?.activa &&
    configuracion.enlace &&
    !consulta.cargando &&
    !consulta.error
        ? new URL(configuracion.enlace, window.location.origin).href
        : null;

    async function cambiarPublicacion() {
    if (
        bloqueo.current ||
        ocupado ||
        consulta.error ||
        !configuracion
    ) {
        return;
    }

    bloqueo.current = true;
    setGuardando(true);
    setErrorOperacion(null);
    setMensaje(null);

    const activar = !configuracion.activa;

    try {
        await cambiarEstadoPublicacion(activar);
        setMensaje(
        activar
            ? 'La vista pública está activada.'
            : 'La vista pública está desactivada. El enlace anterior dejó de funcionar.',
        );
    } catch (error) {
        setErrorOperacion(
        error instanceof Error
            ? error.message
            : 'No se pudo cambiar el estado de publicación.',
        );
    } finally {
        consulta.recargar();
        bloqueo.current = false;
        setGuardando(false);
    }
    }

    async function copiarEnlace() {
    if (!enlacePublico) return;

    setErrorOperacion(null);
    setMensaje(null);

    try {
        await navigator.clipboard.writeText(enlacePublico);
        setMensaje('Enlace copiado.');
    } catch {
        setErrorOperacion(
        'No se pudo copiar automáticamente. Seleccioná el enlace y copialo manualmente.',
        );
    }
    }

  async function guardar(
    codigo: CodigoIndicador,
    habilitado: boolean,
  ) {
    if (bloqueo.current || ocupado || consulta.error) return;

    bloqueo.current = true;
    setGuardando(true);
    setErrorOperacion(null);
    setMensaje(null);

    try {
      await cambiarIndicador(codigo, habilitado);
      consulta.recargar();
      setMensaje('La selección se guardó correctamente.');
    } catch (error) {
      setErrorOperacion(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la selección.',
      );

      // Recupera también una posible modificación de otro administrador.
      consulta.recargar();
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  }

  async function previsualizar() {
    if (bloqueo.current || ocupado || consulta.error) return;

    bloqueo.current = true;
    setMostrarVista(true);
    setCargandoVista(true);
    setVista(null);
    setErrorVista(null);

    try {
      setVista(await getPrevisualizacion());
    } catch (error) {
      setErrorVista(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la previsualización.',
      );
    } finally {
      bloqueo.current = false;
      setCargandoVista(false);
    }
  }

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2">
        Indicadores de la Vista Pública
      </h2>

      <Card
        className="shadow-sm border-0 mx-auto"
        style={{ maxWidth: 800 }}
      >
        <Card.Header className="bg-body-tertiary py-3">
          <h5 className="mb-0">Elegir qué información mostrar</h5>
        </Card.Header>

        <Card.Body className="p-4">
            <section
                className="bg-body-tertiary border rounded p-3 mb-4"
                aria-labelledby="titulo-publicacion"
                >
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                    <h5 id="titulo-publicacion" className="mb-1">
                        Publicación del establecimiento
                    </h5>

                    <p className="text-body-secondary mb-0" role="status">
                        {consulta.cargando
                        ? 'Actualizando estado...'
                        : consulta.error || !configuracion
                            ? 'Estado no disponible.'
                            : configuracion.activa
                            ? 'Activa: cualquier persona con el enlace puede consultarla.'
                            : 'Desactivada: la vista pública no está disponible.'}
                    </p>
                    </div>

                    <Button
                    variant={configuracion?.activa ? 'outline-danger' : 'success'}
                    disabled={
                        ocupado ||
                        !configuracion ||
                        Boolean(consulta.error)
                    }
                    onClick={() => void cambiarPublicacion()}
                    >
                    {guardando
                        ? 'Guardando...'
                        : configuracion?.activa
                        ? 'Desactivar vista pública'
                        : 'Activar vista pública'}
                    </Button>
                </div>

                {enlacePublico && (
                    <div className="mt-4">
                    <Form.Group controlId="enlace-vista-publica">
                        <Form.Label>Enlace público</Form.Label>

                        <div className="d-flex flex-wrap gap-2">
                        <Form.Control
                            type="url"
                            value={enlacePublico}
                            readOnly
                            onFocus={(event) => event.target.select()}
                            style={{ flex: '1 1 240px', minWidth: 0 }}
                        />

                        <Button
                            variant="outline-primary"
                            disabled={ocupado}
                            onClick={() => void copiarEnlace()}
                        >
                            <i className="bi bi-copy me-2" aria-hidden="true" />
                            Copiar enlace
                        </Button>

                        <a
                            href={enlacePublico}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-secondary"
                        >
                            Abrir
                            <i
                            className="bi bi-box-arrow-up-right ms-2"
                            aria-hidden="true"
                            />
                        </a>
                        </div>
                    </Form.Group>

                    <div className="d-flex flex-wrap align-items-center gap-3 mt-3">
                        <div
                        className="d-inline-flex rounded p-3"
                        style={{ backgroundColor: '#ffffff' }}
                        >
                        <QRCodeSVG
                            value={enlacePublico}
                            size={160}
                            level="M"
                            marginSize={4}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            title="Código QR para consultar la vista pública"
                        />
                        </div>

                        <p className="text-body-secondary mb-0">
                        Escaneá este código para consultar los indicadores publicados.
                        </p>
                    </div>
                    </div>
                )}
            </section>
          <Alert variant="info">
            Cada cambio se guarda automáticamente. Esta selección
            no activa ni desactiva la publicación general.
          </Alert>

          <p className="text-body-secondary">
            Los detalles de incidentes, no conformidades y datos
            personales no están disponibles para publicar.
          </p>

          {consulta.error && (
            <>
              <ErrorAlert mensaje={consulta.error} />

              <Button
                variant="outline-secondary"
                disabled={ocupado}
                onClick={consulta.recargar}
                className="mb-3"
              >
                Actualizar configuración
              </Button>
            </>
          )}

          {errorOperacion && (
            <ErrorAlert mensaje={errorOperacion} />
          )}

          {mensaje && !errorOperacion && !consulta.error && (
            <div role="status" className="text-success mb-3">
              {mensaje}
            </div>
          )}

          {consulta.cargando && !configuracion && (
            <LoadingSpinner mensaje="Cargando configuración..." />
          )}

          {configuracion && (
            <div className="d-flex flex-column gap-3">
              {OPCIONES.map((opcion) => (
                <div
                  key={opcion.codigo}
                  className="bg-body-tertiary border rounded p-3"
                >
                  <Form.Check
                    type="switch"
                    id={`indicador-${opcion.codigo}`}
                    label={opcion.titulo}
                    checked={configuracion.indicadores_habilitados.includes(
                      opcion.codigo,
                    )}
                    disabled={ocupado || Boolean(consulta.error)}
                    onChange={(event) =>
                      void guardar(
                        opcion.codigo,
                        event.target.checked,
                      )
                    }
                    aria-describedby={`detalle-${opcion.codigo}`}
                  />

                  <p
                    id={`detalle-${opcion.codigo}`}
                    className="small text-body-secondary mt-2 mb-0"
                  >
                    {opcion.descripcion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card.Body>

        <Card.Footer className="bg-body d-flex justify-content-end p-3">
          <Button
            variant="primary"
            disabled={
              ocupado ||
              !configuracion ||
              Boolean(consulta.error)
            }
            onClick={() => void previsualizar()}
          >
            <i className="bi bi-eye me-2" aria-hidden="true" />
            Previsualizar Vista Pública
          </Button>
        </Card.Footer>
      </Card>

      <Modal
        show={mostrarVista}
        onHide={() => setMostrarVista(false)}
        size="lg"
        fullscreen="md-down"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Previsualización</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <Alert variant="secondary">
            Previsualización privada. Abrirla no activa la publicación.
          </Alert>

          {cargandoVista && (
            <LoadingSpinner mensaje="Cargando indicadores..." />
          )}

          {errorVista && <ErrorAlert mensaje={errorVista} />}

          {!cargandoVista && !errorVista && vista && (
            <VistaPublicaContenido datos={vista} />
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setMostrarVista(false)}
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
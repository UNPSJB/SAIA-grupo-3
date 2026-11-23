import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { EditorAdvertencias, EditorReglas } from './EditorReglas';
import { EditorUmbrales } from './EditorUmbrales';
import { ESTADOS } from './etiquetas';
import { ProbarParametros } from './ProbarParametros';
import {
  crearVersion,
  descartarBorrador,
  getConjunto,
  guardarBorrador,
  publicarConjunto,
} from './rotuladoApi';
import type { Conjunto, ConjuntoDatos } from './types';

function aDatos(conjunto: Conjunto): ConjuntoDatos {
  return {
    nombre: conjunto.nombre,
    norma_origen: conjunto.norma_origen,
    fecha_vigencia: conjunto.fecha_vigencia,
    motivo: conjunto.motivo,
    umbrales: conjunto.umbrales.map((u) => ({
      sello: u.sello,
      leyenda: u.leyenda,
      nutriente: u.nutriente,
      formula: u.formula,
      factor_energetico: u.factor_energetico,
      limite: u.limite,
      unidad: u.unidad,
      comparacion: u.comparacion,
      aplica_a: u.aplica_a,
      requiere_agregado: u.requiere_agregado,
      requiere_alguno_de: u.requiere_alguno_de,
      energia_maxima_porcion: u.energia_maxima_porcion,
      nota: u.nota,
    })),
    reglas: conjunto.reglas.map((r) => ({
      operador: r.operador,
      hechos: r.hechos,
      resultado: r.resultado,
      mensaje: r.mensaje,
    })),
    advertencias: conjunto.advertencias.map((a) => ({ hecho: a.hecho, texto: a.texto })),
  };
}

type Accion = 'publicar' | 'descartar' | 'copiar' | null;

export function ConjuntoParametrosPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const conjuntoId = Number(id);
  const consulta = useConsulta(() => getConjunto(conjuntoId), [conjuntoId]);
  const [borrador, setBorrador] = useState<{ id: number; datos: ConjuntoDatos } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion>(null);
  const [motivoCopia, setMotivoCopia] = useState('');
  const [ocupado, setOcupado] = useState(false);

  if (consulta.error) return <ErrorAlert mensaje={consulta.error} />;
  if (!consulta.datos) return <LoadingSpinner mensaje="Cargando parámetros..." />;

  const conjunto = consulta.datos;
  const editable = conjunto.estado === 'borrador';
  const original = aDatos(conjunto);
  const datos = borrador?.id === conjunto.id ? borrador.datos : original;
  const hayCambios = JSON.stringify(datos) !== JSON.stringify(original);
  const cambiar = (cambios: Partial<ConjuntoDatos>) => {
    setAviso(null);
    setBorrador({ id: conjunto.id, datos: { ...datos, ...cambios } });
  };

  const ejecutar = async (tarea: () => Promise<void>) => {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await tarea();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setOcupado(false);
    }
  };

  const guardar = () =>
    ejecutar(async () => {
      if (datos.umbrales.some((u) => Number.isNaN(u.limite)))
        throw new Error('Cada umbral necesita su límite.');
      await guardarBorrador(conjunto.id, datos);
      setBorrador(null);
      consulta.recargar();
      setAviso('Borrador guardado.');
    });

  const confirmar = () =>
    ejecutar(async () => {
      if (accion === 'publicar') {
        if (hayCambios) await guardarBorrador(conjunto.id, datos);
        await publicarConjunto(conjunto.id);
        setBorrador(null);
        setAccion(null);
        consulta.recargar();
        setAviso('Versión publicada: desde ahora los cálculos nuevos la usan.');
      } else if (accion === 'descartar') {
        await descartarBorrador(conjunto.id);
        navigate('/parametros-normativos');
      } else if (accion === 'copiar') {
        if (!motivoCopia.trim()) throw new Error('Indicá el motivo del cambio.');
        const nuevo = await crearVersion(motivoCopia.trim(), conjunto.id);
        setAccion(null);
        navigate(`/parametros-normativos/${nuevo.id}`);
      }
    });

  return (
    <Container className="py-2">
      <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center border-bottom pb-2 mb-3">
        <div>
          <h2 className="text-secondary mb-1">Parámetros normativos · versión {conjunto.numero}</h2>
          <div className="d-flex flex-wrap gap-2 align-items-center small text-body-secondary">
            <Badge bg={ESTADOS[conjunto.estado].color}>{ESTADOS[conjunto.estado].etiqueta}</Badge>
            <span>
              Creada {formatearFechaHora(conjunto.creado_en)}
              {conjunto.creado_por
                ? ` por ${conjunto.creado_por.nombre} ${conjunto.creado_por.apellido}`
                : ' por el sistema (datos iniciales)'}
            </span>
            {conjunto.publicado_en && (
              <span>· publicada {formatearFechaHora(conjunto.publicado_en)}</span>
            )}
            {conjunto.archivado_en && (
              <span>· archivada {formatearFechaHora(conjunto.archivado_en)}</span>
            )}
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" onClick={() => navigate('/parametros-normativos')}>
            Volver
          </Button>
          {editable ? (
            <>
              <Button
                variant="outline-danger"
                onClick={() => setAccion('descartar')}
                disabled={ocupado}
              >
                Descartar borrador
              </Button>
              <Button variant="outline-primary" onClick={guardar} disabled={ocupado || !hayCambios}>
                Guardar borrador
              </Button>
              <Button variant="success" onClick={() => setAccion('publicar')} disabled={ocupado}>
                Publicar
              </Button>
            </>
          ) : (
            <Button onClick={() => setAccion('copiar')}>
              Crear versión nueva a partir de esta
            </Button>
          )}
        </div>
      </div>

      {!editable && (
        <Alert variant="secondary" className="py-2 small">
          <i className="bi bi-lock-fill me-2" aria-hidden="true" />
          Esta versión es de solo lectura. Para cambiarla, creá una versión nueva.
        </Alert>
      )}
      {error && <ErrorAlert mensaje={error} />}
      {aviso && (
        <Alert variant="success" className="d-flex align-items-center" dismissible onClose={() => setAviso(null)}>
          {aviso}
        </Alert>
      )}

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          Datos de la versión
        </Card.Header>
        <Card.Body className="p-3 p-md-4">
          {editable ? (
            <Row className="g-3">
              <Col md={8}>
                <Form.Group controlId="conjunto-nombre">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control
                    maxLength={150}
                    value={datos.nombre}
                    onChange={(e) => cambiar({ nombre: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="conjunto-fecha">
                  <Form.Label>Fecha de vigencia de la norma</Form.Label>
                  <Form.Control
                    type="date"
                    value={datos.fecha_vigencia ?? ''}
                    onChange={(e) => cambiar({ fecha_vigencia: e.target.value || null })}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="conjunto-norma">
                  <Form.Label>Norma de origen</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    maxLength={500}
                    value={datos.norma_origen}
                    onChange={(e) => cambiar({ norma_origen: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="conjunto-motivo">
                  <Form.Label>Motivo del cambio</Form.Label>
                  <Form.Control
                    maxLength={500}
                    value={datos.motivo}
                    onChange={(e) => cambiar({ motivo: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          ) : (
            <Row className="g-3 small">
              <Col md={8}>
                <div className="text-body-secondary">Nombre</div>
                <div className="fw-semibold">{conjunto.nombre}</div>
              </Col>
              <Col md={4}>
                <div className="text-body-secondary">Fecha de vigencia</div>
                <div className="fw-semibold">{formatearFecha(conjunto.fecha_vigencia)}</div>
              </Col>
              <Col xs={12}>
                <div className="text-body-secondary">Norma de origen</div>
                <div>{conjunto.norma_origen}</div>
              </Col>
              <Col xs={12}>
                <div className="text-body-secondary">Motivo</div>
                <div>{conjunto.motivo}</div>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          Umbrales de los sellos
        </Card.Header>
        <Card.Body className="p-0">
          <EditorUmbrales
            umbrales={datos.umbrales}
            editable={editable}
            onChange={(umbrales) => cambiar({ umbrales })}
          />
        </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        <Col lg={editable ? 12 : 7}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
              Reglas de aplicabilidad
            </Card.Header>
            <Card.Body className="p-0">
              <p className="small text-body-secondary px-3 pt-3 mb-0">
                Se evalúan en orden y gana la primera que se cumple. La última debe ser «En
                cualquier otro caso».
              </p>
              <EditorReglas
                reglas={datos.reglas}
                editable={editable}
                onChange={(reglas) => cambiar({ reglas })}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={editable ? 12 : 5}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
              Leyendas precautorias
            </Card.Header>
            <Card.Body className="p-0">
              <EditorAdvertencias
                advertencias={datos.advertencias}
                editable={editable}
                onChange={(advertencias) => cambiar({ advertencias })}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          Probar esta versión
        </Card.Header>
        <Card.Body className="p-0">
          <ProbarParametros conjuntoId={conjunto.id} hayCambios={editable && hayCambios} />
        </Card.Body>
      </Card>

      <Modal show={accion !== null} onHide={() => setAccion(null)}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">
            {accion === 'publicar' && `Publicar la versión ${conjunto.numero}`}
            {accion === 'descartar' && `Descartar el borrador ${conjunto.numero}`}
            {accion === 'copiar' && 'Crear versión nueva'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {accion === 'publicar' && (
            <p className="mb-0">
              Pasa a ser la versión vigente y la anterior queda archivada en solo lectura. Los
              cálculos ya hechos conservan la versión con la que se calcularon.
            </p>
          )}
          {accion === 'descartar' && <p className="mb-0">Se borra el borrador y sus cambios.</p>}
          {accion === 'copiar' && (
            <Form.Group controlId="copiar-motivo">
              <Form.Label>Motivo del cambio</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={500}
                value={motivoCopia}
                onChange={(e) => setMotivoCopia(e.target.value)}
              />
            </Form.Group>
          )}
          {error && accion !== null && (
            <div className="mt-3">
              <ErrorAlert mensaje={error} />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setAccion(null)}>
            Cancelar
          </Button>
          <Button
            variant={
              accion === 'descartar' ? 'danger' : accion === 'publicar' ? 'success' : 'primary'
            }
            onClick={confirmar}
            disabled={ocupado}
          >
            {accion === 'publicar'
              ? 'Publicar'
              : accion === 'descartar'
                ? 'Descartar'
                : 'Crear borrador'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

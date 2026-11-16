import { useState } from 'react';
import { Alert, Badge, Button, Card, Container, Form, Modal, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { ESTADOS } from './etiquetas';
import { crearVersion, listarConjuntos } from './rotuladoApi';

export function ParametrosNormativosPage() {
  const navigate = useNavigate();
  const consulta = useConsulta(listarConjuntos, []);
  const [creando, setCreando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const conjuntos = consulta.datos ?? [];
  const borrador = conjuntos.find((c) => c.estado === 'borrador');

  const crear = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!motivo.trim()) {
      setError('Indicá el motivo del cambio (por ejemplo, la norma nueva).');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const nuevo = await crearVersion(motivo.trim());
      navigate(`/parametros-normativos/${nuevo.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la versión.');
      setGuardando(false);
    }
  };

  return (
    <Container className="py-2">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center border-bottom pb-2 mb-3">
        <h2 className="text-secondary mb-0">Parámetros normativos</h2>
        {consulta.datos &&
          (borrador ? (
            <Button
              variant="warning"
              onClick={() => navigate(`/parametros-normativos/${borrador.id}`)}
            >
              Continuar borrador (versión {borrador.numero})
            </Button>
          ) : (
            <Button onClick={() => setCreando(true)}>Nueva versión copiando la vigente</Button>
          ))}
      </div>
      <p className="text-body-secondary small">
        Umbrales, fórmulas y reglas del rotulado frontal (octógonos). Una versión vigente no se
        modifica: para un cambio normativo se crea una versión nueva, se ajusta y se publica. Cada
        cálculo guarda la versión con la que se hizo. Los mantienen las personas con permiso de
        administrar.
      </p>
      {consulta.error && <ErrorAlert mensaje={consulta.error} />}
      {!consulta.datos && !consulta.error && <LoadingSpinner mensaje="Cargando versiones..." />}
      {consulta.datos && conjuntos.length === 0 && (
        <Alert variant="warning">
          Todavía no hay parámetros cargados. Corré el script de datos iniciales:{' '}
          <code>python -m scripts.datos_iniciales_rotulado_frontal</code>
        </Alert>
      )}
      {conjuntos.length > 0 && (
        <Card className="shadow-sm border-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr className="small text-body-secondary">
                <th className="ps-3">Versión</th>
                <th>Nombre y norma de origen</th>
                <th className="text-nowrap">Vigencia</th>
                <th>Estado</th>
                <th>Publicada</th>
              </tr>
            </thead>
            <tbody>
              {conjuntos.map((conjunto) => (
                <tr
                  key={conjunto.id}
                  role="button"
                  onClick={() => navigate(`/parametros-normativos/${conjunto.id}`)}
                >
                  <td className="ps-3 fw-semibold">{conjunto.numero}</td>
                  <td>
                    <div className="fw-semibold">{conjunto.nombre}</div>
                    <div className="small text-body-secondary">{conjunto.norma_origen}</div>
                  </td>
                  <td className="text-nowrap">
                    {conjunto.fecha_vigencia ? formatearFecha(conjunto.fecha_vigencia) : '—'}
                  </td>
                  <td>
                    <Badge bg={ESTADOS[conjunto.estado].color}>
                      {ESTADOS[conjunto.estado].etiqueta}
                    </Badge>
                  </td>
                  <td className="small text-body-secondary text-nowrap">
                    {conjunto.publicado_en ? formatearFechaHora(conjunto.publicado_en) : '—'}
                    {conjunto.publicado_por && (
                      <div>
                        {conjunto.publicado_por.nombre} {conjunto.publicado_por.apellido}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Modal show={creando} onHide={() => setCreando(false)}>
        <Form noValidate onSubmit={crear}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">Nueva versión de parámetros</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="small text-body-secondary">
              Se crea un borrador copiando la versión vigente. La vigente sigue en uso hasta que
              publiques el borrador.
            </p>
            <Form.Group controlId="nueva-version-motivo">
              <Form.Label>Motivo del cambio</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={500}
                placeholder="Ej.: actualización por la Disposición ANMAT N.º ..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </Form.Group>
            {error && (
              <div className="mt-3">
                <ErrorAlert mensaje={error} />
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setCreando(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Creando...' : 'Crear borrador'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

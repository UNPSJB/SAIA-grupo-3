import {
  Badge,
  Button,
  Card,
  Container,
  Form,
  Modal,
  Table,
} from 'react-bootstrap';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import {
  etiquetaDe,
  textoBadge,
} from '../../shared/libreria/etiquetas';
import {
  COLORES_DOCUMENTO_TECNICO,
  TIPOS_DOCUMENTO_TECNICO,
} from './types';
import { useDocumentosVigentes } from './useDocumentosVigentes';

const esVisualizable = (tipo: string) =>
  tipo === 'application/pdf' || tipo.startsWith('image/');

export function DocumentosVigentesPage() {
  const {
    tipo,
    lista,
    detalle,
    setSeleccionado,
    versionElegida,
    setVersionElegida,
    vista,
    setVista,
    errorArchivo,
    setErrorArchivo,
    ocupado,
    historial,
    versiones,
    cargandoHistorial,
    errorHistorial,
    verHistorial,
    abrirArchivo,
    cerrarHistorial,
  } = useDocumentosVigentes();

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Documentos vigentes</h2>
      {!detalle && (
        <>
          <ListControls
            busqueda={lista.busqueda}
            setBusqueda={lista.setBusqueda}
            title="Consultá la versión vigente antes de operar"
            filters={
              <Form.Select
                aria-label="Filtrar por tipo de documento"
                value={tipo}
                onChange={(e) => lista.update({ tipo: e.target.value })}
                style={{ width: 220, maxWidth: '100%' }}
              >
                <option value="">Todos los tipos</option>
                {TIPOS_DOCUMENTO_TECNICO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
            }
          />
          {(lista.error || errorArchivo) && (
            <ErrorAlert mensaje={errorArchivo || lista.error || ''} />
          )}
          {lista.loading ? (
            <LoadingSpinner mensaje="Cargando documentos vigentes..." />
          ) : (
            <>
              <Table striped hover responsive className="align-middle" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Versión vigente</th>
                    <th>Entrada en vigencia</th>
                    <th className="text-center" style={{ width: 120 }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        No hay documentos para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                  {lista.items.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.nombre}</strong>
                      </td>
                      <td>
                        <Badge
                          bg={COLORES_DOCUMENTO_TECNICO[doc.tipo]}
                          text={textoBadge(COLORES_DOCUMENTO_TECNICO[doc.tipo])}
                        >
                          {etiquetaDe(TIPOS_DOCUMENTO_TECNICO, doc.tipo)}
                        </Badge>
                      </td>
                      <td>
                        {doc.version_vigente ? (
                          <Badge bg="secondary">v{doc.version_vigente.numero}</Badge>
                        ) : (
                          'Sin versión vigente disponible'
                        )}
                      </td>
                      <td>
                        {doc.fecha_vigencia
                          ? formatearFechaHora(doc.fecha_vigencia)
                          : 'Fecha de vigencia no registrada'}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="primary"
                          size="sm"
                          className="py-1 px-2 shadow-sm"
                          title="Ver documento"
                          aria-label={`Ver documento ${doc.nombre}`}
                          onClick={() => {
                            setErrorArchivo(null);
                            setSeleccionado(doc);
                          }}
                        >
                          <i className="bi bi-eye-fill" aria-hidden="true"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <ListPagination
                page={lista.page}
                totalPages={lista.totalPages}
                total={lista.total}
                changePage={lista.setPage}
              />
            </>
          )}
        </>
      )}
      {detalle && (
        <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
          <Card.Header className="bg-body-tertiary text-secondary d-flex flex-wrap align-items-center gap-2 py-3">
            <h5 className="mb-0 text-break">{detalle.nombre}</h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Badge
              bg={COLORES_DOCUMENTO_TECNICO[detalle.tipo]}
              text={textoBadge(COLORES_DOCUMENTO_TECNICO[detalle.tipo])}
            >
              {etiquetaDe(TIPOS_DOCUMENTO_TECNICO, detalle.tipo)}
            </Badge>
            {errorArchivo && <ErrorAlert mensaje={errorArchivo} />}
            <div className="border rounded p-3 mt-3">
              <h5>
                Versión vigente{' '}
                {detalle.version_vigente && (
                  <Badge bg="success">v{detalle.version_vigente.numero}</Badge>
                )}
              </h5>
              {detalle.version_vigente ? (
                <>
                  <p className="mb-1 text-break">{detalle.version_vigente.nombre_original}</p>
                  <p className="text-muted">
                    {detalle.fecha_vigencia
                      ? `Vigente desde ${formatearFechaHora(detalle.fecha_vigencia)}`
                      : 'Fecha de vigencia no registrada'}
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    {esVisualizable(detalle.version_vigente.tipo_contenido) && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={ocupado !== null}
                        onClick={() => void abrirArchivo(detalle, true)}
                      >
                        <i className="bi bi-eye me-1" aria-hidden="true"></i>Ver
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={ocupado !== null}
                      onClick={() => void abrirArchivo(detalle, false)}
                    >
                      <i className="bi bi-download me-1" aria-hidden="true"></i>
                      {ocupado === detalle.id ? 'Cargando...' : 'Descargar'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted mb-0">Sin versión vigente disponible</p>
              )}
            </div>
          </Card.Body>
          <Card.Footer className="d-flex flex-wrap justify-content-end gap-2 border-top-0 pb-4 px-4">
            <Button
              variant="info"
              className="me-auto"
              disabled={ocupado !== null}
              onClick={() => void verHistorial(detalle)}
            >
              <i className="bi bi-clock-history me-1" aria-hidden="true"></i>Ver historial
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSeleccionado(null);
                setErrorArchivo(null);
              }}
            >
              Volver
            </Button>
          </Card.Footer>
        </Card>
      )}
      <Modal
        show={historial !== null && vista === null}
        onHide={cerrarHistorial}
        size="lg"
        fullscreen="md-down"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Historial — {historial?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="alert alert-warning">
            Las versiones archivadas son solo para consulta. Para operar, usá la versión vigente.
          </p>
          {errorHistorial && <ErrorAlert mensaje={errorHistorial} />}
          {errorArchivo && <ErrorAlert mensaje={errorArchivo} />}
          {cargandoHistorial ? (
            <LoadingSpinner mensaje="Cargando historial..." />
          ) : (
            <>
              {versiones.length === 0 && !errorHistorial && <p>No hay versiones registradas.</p>}
              {versiones.length > 0 && (
                <Form.Group controlId="historial-operador-version">
                  <Form.Label>Seleccione una versión para consultar</Form.Label>
                  <Form.Select
                    value={versionElegida}
                    onChange={(e) => setVersionElegida(e.target.value)}
                  >
                    <option value="">Desplegar versiones anteriores...</option>
                    {versiones.map((version) => (
                      <option key={version.id} value={version.id}>
                        Versión {version.numero} ·{' '}
                        {version.estado === 'vigente' ? 'Vigente actual' : 'Archivada'}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
              {versiones
                .filter((version) => String(version.id) === versionElegida)
                .map((version) => (
                  <div key={version.id} className="border rounded p-3 mb-2">
                    <strong>Versión {version.numero}</strong>{' '}
                    <Badge bg={version.estado === 'vigente' ? 'success' : 'secondary'}>
                      {version.estado === 'vigente' ? 'Vigente' : 'Archivada — no usar para operar'}
                    </Badge>
                    <p className="text-muted mb-2">
                      Subida el {formatearFechaHora(version.fecha_subida)}
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {esVisualizable(version.tipo_contenido) && (
                        <Button
                          size="sm"
                          disabled={ocupado !== null}
                          onClick={() => historial && void abrirArchivo(historial, true, version)}
                        >
                          Ver versión {version.numero}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline-primary"
                        disabled={ocupado !== null}
                        onClick={() => historial && void abrirArchivo(historial, false, version)}
                      >
                        Descargar versión {version.numero}
                      </Button>
                    </div>
                  </div>
                ))}
            </>
          )}
        </Modal.Body>
      </Modal>
      <Modal
        show={vista !== null}
        onHide={() => setVista(null)}
        size="xl"
        fullscreen="md-down"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{vista?.titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {vista &&
            (vista.tipo === 'application/pdf' ? (
              <iframe
                title={vista.titulo}
                src={vista.url}
                style={{ width: '100%', height: '70vh', border: 0 }}
              />
            ) : (
              <img
                src={vista.url}
                alt={vista.titulo}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            ))}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

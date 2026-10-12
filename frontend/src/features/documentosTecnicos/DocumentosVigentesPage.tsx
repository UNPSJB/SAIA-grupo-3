import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Container, Form, Modal, Table } from 'react-bootstrap';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { usePagedList } from '../../shared/hooks/usePagedList';
import { API_BASE_URL, fetchWithAuth, mensajeDeError } from '../../shared/libreria/api';
import { formatearFecha } from '../../shared/libreria/fechas';
import {
  COLORES_DOCUMENTO_TECNICO,
  TIPOS_DOCUMENTO_TECNICO,
  type TipoDocumentoTecnico,
} from './types';
interface DocumentoVigente {
  id: number;
  nombre: string;
  tipo: TipoDocumentoTecnico;
  fecha_vigencia: string | null;
  version_vigente: {
    id: number;
    numero: number;
    nombre_original: string;
    tipo_contenido: string;
  } | null;
}
interface VersionHistorial {
  id: number;
  numero: number;
  estado: 'vigente' | 'archivado';
  fecha_subida: string;
  nombre_original: string;
  tipo_contenido: string;
}
interface VistaArchivo {
  url: string;
  tipo: string;
  titulo: string;
}
const esVisualizable = (tipo: string) => tipo === 'application/pdf' || tipo.startsWith('image/');
export function DocumentosVigentesPage() {
  const [params] = useSearchParams();
  const tipo = params.get('tipo') || '';
  const lista = usePagedList<DocumentoVigente>(
    'documentos-vigentes/',
    true,
    tipo ? `&tipo=${encodeURIComponent(tipo)}` : '',
    'nombre',
  );
  const [seleccionado, setSeleccionado] = useState<DocumentoVigente | null>(null);
  const detalle = lista.items.find((doc) => doc.id === seleccionado?.id) || seleccionado;
  const [versionElegida, setVersionElegida] = useState('');
  const [vista, setVista] = useState<VistaArchivo | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [historial, setHistorial] = useState<DocumentoVigente | null>(null);
  const [versiones, setVersiones] = useState<VersionHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
  const consultaHistorial = useRef(0);
  const montado = useRef(true);
  async function verHistorial(doc: DocumentoVigente) {
    const consulta = ++consultaHistorial.current;
    setHistorial(doc);
    setVersionElegida('');
    setVersiones([]);
    setErrorHistorial(null);
    setErrorArchivo(null);
    setCargandoHistorial(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/documentos-vigentes/${doc.id}/historial`);
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(mensajeDeError(datos.detail, 'No se pudo cargar el historial.'));
      if (montado.current && consulta === consultaHistorial.current) setVersiones(datos);
    } catch (error) {
      if (montado.current && consulta === consultaHistorial.current)
        setErrorHistorial(
          error instanceof Error ? error.message : 'No se pudo cargar el historial.',
        );
    } finally {
      if (montado.current && consulta === consultaHistorial.current) setCargandoHistorial(false);
    }
  }
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (vista) URL.revokeObjectURL(vista.url);
    },
    [vista],
  );
  async function abrirArchivo(
    doc: DocumentoVigente,
    visualizar: boolean,
    version?: VersionHistorial,
  ) {
    setOcupado(doc.id);
    setErrorArchivo(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/documentos-vigentes/${doc.id}/${version ? `historial/${version.id}/archivo` : 'archivo'}`,
      );
      if (!res.ok) {
        const datos = await res.json().catch(() => ({}));
        throw new Error(
          mensajeDeError(datos.detail, 'No se pudo cargar el archivo de esta versión.'),
        );
      }
      const blob = await res.blob();
      if (!montado.current) return;
      const numero = res.headers.get('X-Version-Numero');
      const versionId = Number(res.headers.get('X-Version-Id'));
      const nombre = decodeURIComponent(res.headers.get('X-Archivo-Nombre') || 'documento');
      if (!version && versionId !== doc.version_vigente?.id) lista.refetch();
      const archivada = res.headers.get('X-Version-Estado') === 'archivado';
      const url = URL.createObjectURL(blob);
      if (visualizar && esVisualizable(blob.type))
        setVista({
          url,
          tipo: blob.type,
          titulo: `${doc.nombre} — v${numero}${archivada ? ' — Archivada: no usar para operar' : ' — Vigente'}`,
        });
      else {
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (montado.current) {
        setErrorArchivo(error instanceof Error ? error.message : 'No se pudo cargar el archivo.');
        lista.refetch();
      }
    } finally {
      if (montado.current) setOcupado(null);
    }
  }
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
                          text={
                            doc.tipo === 'ficha_tecnica' || doc.tipo === 'procedimiento'
                              ? 'dark'
                              : 'white'
                          }
                        >
                          {TIPOS_DOCUMENTO_TECNICO.find((t) => t.value === doc.tipo)?.label ||
                            doc.tipo}
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
                          ? formatearFecha(doc.fecha_vigencia)
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
          <Card.Header className="bg-light text-secondary d-flex flex-wrap align-items-center gap-2 py-3">
            <h5 className="mb-0 text-break">{detalle.nombre}</h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Badge
              bg={COLORES_DOCUMENTO_TECNICO[detalle.tipo]}
              text={
                detalle.tipo === 'ficha_tecnica' || detalle.tipo === 'procedimiento'
                  ? 'dark'
                  : 'white'
              }
            >
              {TIPOS_DOCUMENTO_TECNICO.find((t) => t.value === detalle.tipo)?.label || detalle.tipo}
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
                      ? `Vigente desde ${formatearFecha(detalle.fecha_vigencia)}`
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
        onHide={() => {
          consultaHistorial.current++;
          setHistorial(null);
        }}
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
                      Subida el {formatearFecha(version.fecha_subida)}
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

import { Badge, Button, Card, Form, Pagination, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useDocumentosTecnicos } from './useDocumentosTecnicos';
import {
  TIPOS_DOCUMENTO_TECNICO,
  type DocumentoTecnicoResumen, type TipoDocumentoTecnico,
} from './types';

function etiquetaTipo(tipo: TipoDocumentoTecnico): string {
  return TIPOS_DOCUMENTO_TECNICO.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface DocumentoTecnicoListProps {
  onNuevo: () => void;
  onVer: (documento: DocumentoTecnicoResumen) => void;
  onEditar: (documento: DocumentoTecnicoResumen) => void;
}

export function DocumentoTecnicoList({ onNuevo, onVer, onEditar }: DocumentoTecnicoListProps) {
  const {
    documentos, loading, error,
    page, totalPages, total, setPage,
    tipo, cambiarTipo, busqueda, cambiarBusqueda,
  } = useDocumentosTecnicos();

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h4 className="mb-0 text-secondary">Manuales, procedimientos y recetas</h4>
        <Button variant="success" size="sm" onClick={onNuevo} className="d-flex align-items-center gap-1 shadow-sm">
          <i className="bi bi-plus-lg"></i><span>Nuevo documento</span>
        </Button>
      </div>

      {/* Filtros */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Form.Control
          type="search"
          size="sm"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => cambiarBusqueda(e.target.value)}
          style={{ maxWidth: '240px' }}
        />
        <Form.Select
          size="sm"
          value={tipo}
          onChange={(e) => cambiarTipo(e.target.value as TipoDocumentoTecnico | '')}
          style={{ maxWidth: '200px' }}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_DOCUMENTO_TECNICO.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Form.Select>
      </div>

      {error && <ErrorAlert mensaje={error} />}

      {loading ? (
        <LoadingSpinner mensaje="Cargando documentos técnicos..." />
      ) : (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Versión vigente</th>
                  <th>Última actualización</th>
                  <th className="text-center" style={{ width: '120px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No hay documentos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  documentos.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.nombre}</strong>
                        {doc.descripcion && (
                          <small className="d-block text-muted text-truncate" style={{ maxWidth: '320px' }}>
                            {doc.descripcion}
                          </small>
                        )}
                      </td>
                      <td><Badge bg="info" className="text-dark">{etiquetaTipo(doc.tipo)}</Badge></td>
                      <td>{doc.version_vigente ? <Badge bg="secondary">v{doc.version_vigente.numero}</Badge> : '—'}</td>
                      <td>{doc.version_vigente ? formatearFecha(doc.version_vigente.fecha_subida) : '—'}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button variant="primary" size="sm" title="Ver detalle e historial" onClick={() => onVer(doc)}>
                            <i className="bi bi-eye-fill"></i>
                          </Button>
                          <Button variant="warning" size="sm" className="text-white" title="Modificar" onClick={() => onEditar(doc)}>
                            <i className="bi bi-pencil-fill"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>

          {totalPages > 1 && (
            <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
              <span className="text-muted small mb-2 mb-md-0">
                Página {page} de {totalPages} ({total} documentos)
              </span>
              <Pagination className="mb-0" size="sm">
                <Pagination.Prev onClick={() => setPage(page - 1)} disabled={page === 1} />
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((numero) => (
                  <Pagination.Item key={numero} active={numero === page} onClick={() => setPage(numero)}>
                    {numero}
                  </Pagination.Item>
                ))}
                <Pagination.Next onClick={() => setPage(page + 1)} disabled={page === totalPages} />
              </Pagination>
            </Card.Footer>
          )}
        </Card>
      )}
    </>
  );
}

import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { Badge, Button, Card, Form, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useDocumentosTecnicos } from './useDocumentosTecnicos';
import {
  TIPOS_DOCUMENTO_TECNICO,
  COLORES_DOCUMENTO_TECNICO,
  type DocumentoTecnicoResumen,
  type TipoDocumentoTecnico,
} from './types';

function etiquetaTipo(tipo: TipoDocumentoTecnico): string {
  return TIPOS_DOCUMENTO_TECNICO.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface DocumentoTecnicoListProps {
  onNuevo: () => void;
  onVer: (documento: DocumentoTecnicoResumen) => void;
  onEditar: (documento: DocumentoTecnicoResumen) => void;
}

export function DocumentoTecnicoList({ onNuevo, onVer, onEditar }: DocumentoTecnicoListProps) {
  const {
    documentos,
    loading,
    error,
    page,
    totalPages,
    total,
    setPage,
    tipo,
    cambiarTipo,
    busqueda,
    cambiarBusqueda,
    ordenarPor,
    orden,
    cambiarOrden,
  } = useDocumentosTecnicos();

  return (
    <>
      <ListControls
        busqueda={busqueda}
        setBusqueda={cambiarBusqueda}
        title="Manuales, procedimientos y recetas"
        filters={
          <Form.Select
            aria-label="Filtrar por tipo de documento"
            value={tipo}
            onChange={(e) => cambiarTipo(e.target.value as TipoDocumentoTecnico | '')}
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
      >
        <Button
          variant="success"
          onClick={onNuevo}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo documento</span>
        </Button>
      </ListControls>

      {error && <ErrorAlert mensaje={error} />}

      {loading ? (
        <LoadingSpinner mensaje="Cargando documentos técnicos..." />
      ) : (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <SortableHeader
                    column="nombre"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Nombre
                  </SortableHeader>
                  <SortableHeader
                    column="tipo"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Tipo
                  </SortableHeader>
                  <SortableHeader
                    column="version_vigente"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Versión vigente
                  </SortableHeader>
                  <SortableHeader
                    column="ultima_actualizacion"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Última actualización
                  </SortableHeader>
                  <th className="text-center" style={{ width: '120px' }}>
                    Acciones
                  </th>
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
                          <small
                            className="d-block text-muted text-truncate"
                            style={{ maxWidth: '320px' }}
                          >
                            {doc.descripcion}
                          </small>
                        )}
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
                          {etiquetaTipo(doc.tipo)}
                        </Badge>
                      </td>
                      <td>
                        {doc.version_vigente ? (
                          <Badge bg="secondary">v{doc.version_vigente.numero}</Badge>
                        ) : (
                          '—'
                        )}
                        {doc.version_vigente &&
                          (doc.vigencia_actual ? (
                            <>
                              <small className="d-block text-muted mt-1">
                                Marcada por {doc.vigencia_actual.personal.apellido},{' '}
                                {doc.vigencia_actual.personal.nombre}
                              </small>
                              <small className="d-block text-muted">
                                Vigente desde {formatearFecha(doc.vigencia_actual.fecha_vigencia)}
                              </small>
                            </>
                          ) : (
                            <small className="d-block text-muted mt-1">Sin registro previo</small>
                          ))}
                      </td>
                      <td>
                        {doc.version_vigente
                          ? formatearFecha(doc.version_vigente.fecha_subida)
                          : '—'}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            title="Ver detalle e historial"
                            onClick={() => onVer(doc)}
                          >
                            <i className="bi bi-eye-fill"></i>
                          </Button>
                          <Button
                            variant="warning"
                            size="sm"
                            className="text-white py-1 px-2 shadow-sm"
                            title="Modificar"
                            onClick={() => onEditar(doc)}
                          >
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

          {totalPages > 0 && (
            <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
              <ListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                changePage={setPage}
              />
            </Card.Footer>
          )}
        </Card>
      )}
    </>
  );
}

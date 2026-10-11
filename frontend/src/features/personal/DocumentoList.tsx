import { Button, Card, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Documento } from './types';

interface DocumentoListProps {
  documentos: Documento[];
  loading: boolean;
  error: string | null;
  formatearFecha: (fecha: string | null) => string;
  onNuevoClick: () => void;
  onEditarClick: (documento: Documento) => void;
  onEliminarClick: (documento: Documento) => void;
}

export function DocumentoList({
  documentos,
  loading,
  error,
  formatearFecha,
  onNuevoClick,
  onEditarClick,
  onEliminarClick,
}: DocumentoListProps) {
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documentos..." />;
  }

  if (error) {
    return <ErrorAlert mensaje={error} />;
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 mt-4">
        <h4 className="mb-0 text-secondary">Documentación</h4>

        <Button
          variant="success"
          size="sm"
          onClick={onNuevoClick}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Agregar Documento</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Tipo de documento</th>
                <th>Vencimiento</th>
                <th className="text-center" style={{ width: '120px' }}>
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {documentos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-muted">
                    Este empleado aún no tiene documentos cargados.
                  </td>
                </tr>
              ) : (
                documentos.map((documento) => (
                  <tr key={documento.id}>
                    <td>{documento.tipo_documento.nombre}</td>
                    <td>{formatearFecha(documento.fecha_vencimiento)}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          variant="warning"
                          size="sm"
                          className="text-white py-1 px-2 shadow-sm"
                          title="Editar o renovar"
                          aria-label={`Editar o renovar ${documento.tipo_documento.nombre}`}
                          onClick={() => onEditarClick(documento)}
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="py-1 px-2 shadow-sm"
                          title="Eliminar"
                          aria-label={`Eliminar ${documento.tipo_documento.nombre}`}
                          onClick={() => onEliminarClick(documento)}
                        >
                          <i className="bi bi-trash3-fill"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}

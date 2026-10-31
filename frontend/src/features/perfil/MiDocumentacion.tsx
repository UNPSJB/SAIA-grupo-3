import { Badge, Card, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatearFecha, textoDiasRestantes } from '../../shared/libreria/fechas';
import { textoBadge } from '../../shared/libreria/etiquetas';
import { ESTADOS_VENCIMIENTO } from '../personal/types';
import type { DocumentoPerfil } from './types';

interface MiDocumentacionProps {
  documentos: DocumentoPerfil[];
  cargando: boolean;
  error: string | null;
}

function EstadoDocumento({ documento }: { documento: DocumentoPerfil }) {
  const estado = ESTADOS_VENCIMIENTO.find((opcion) => opcion.value === documento.estado);
  if (!estado) {
    return <Badge bg="secondary">Sin vencimiento</Badge>;
  }
  return (
    <Badge bg={estado.variante} text={textoBadge(estado.variante)}>
      {estado.label}
    </Badge>
  );
}

export function MiDocumentacion({ documentos, cargando, error }: MiDocumentacionProps) {
  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-body fw-semibold">
        <i className="bi bi-file-earmark-text me-2" aria-hidden="true" />
        Mi documentación
      </Card.Header>
      <Card.Body className={documentos.length ? 'p-0' : undefined}>
        {cargando && <LoadingSpinner mensaje="Cargando documentación..." />}
        {error && <ErrorAlert mensaje={error} />}
        {!cargando && !error && documentos.length === 0 && (
          <p className="text-body-secondary mb-0">No tenés documentación cargada.</p>
        )}
        {documentos.length > 0 && (
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Vencimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((documento) => (
                <tr key={documento.id}>
                  <td>{documento.tipo_documento.nombre}</td>
                  <td>
                    <div>{formatearFecha(documento.fecha_vencimiento, 'Sin vencimiento')}</div>
                    {documento.dias_restantes !== null && (
                      <div className="small text-body-secondary">
                        {textoDiasRestantes(documento.dias_restantes)}
                      </div>
                    )}
                  </td>
                  <td>
                    <EstadoDocumento documento={documento} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

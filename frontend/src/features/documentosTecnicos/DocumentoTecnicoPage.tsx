import { Container, Button } from 'react-bootstrap';
import { DocumentoTecnicoList } from './DocumentoTecnicoList';
import { DocumentoTecnicoForm } from './DocumentoTecnicoForm';
import { DocumentoTecnicoView } from './DocumentoTecnicoView';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { getDocumentoTecnico } from './documentoTecnicoApi';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import type { DocumentoTecnico } from './types';

export function DocumentoTecnicoPage() {
  const route = useCrudRoute<DocumentoTecnico>('/documentos-tecnicos', getDocumentoTecnico);

  const handleGuardado = (documento: DocumentoTecnico) => {
    route.open(documento);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Documentos Técnicos</h2>

      {route.loading && <LoadingSpinner mensaje="Cargando documento..." />}

      {route.error && (
        <>
          <ErrorAlert mensaje={route.error} />
          <Button variant="secondary" onClick={route.back} className="mt-2">
            Volver
          </Button>
        </>
      )}

      {route.mode === 'listado' && !route.loading && !route.error && (
        <DocumentoTecnicoList
          onNuevo={() => route.open()}
          onVer={(doc) => route.open(doc as unknown as DocumentoTecnico)}
          onEditar={(doc) => route.open(doc as unknown as DocumentoTecnico, 'editar')}
        />
      )}

      {(route.mode === 'crear' || (route.mode === 'editar' && route.item)) && (
        <DocumentoTecnicoForm
          key={route.item?.id ?? 'nuevo'}
          documentoInicial={route.mode === 'editar' ? route.item : null}
          onGuardado={handleGuardado}
          onCancelar={route.mode === 'editar' ? () => route.open(route.item!) : route.back}
        />
      )}

      {route.mode === 'ver' && route.item && (
        <DocumentoTecnicoView
          key={route.item.id}
          documentoId={route.item.id}
          onVolver={route.back}
          onEditar={() => route.open(route.item!, 'editar')}
        />
      )}
    </Container>
  );
}
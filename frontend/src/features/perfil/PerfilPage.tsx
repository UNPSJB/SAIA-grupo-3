import { useEffect, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { CambiarPasswordForm } from './CambiarPasswordForm';
import { DatosPerfil } from './DatosPerfil';
import { MiDocumentacion } from './MiDocumentacion';
import { getMiDocumentacion, getPerfil } from './perfilApi';
import type { DocumentoPerfil, Perfil } from './types';

function mensaje(err: unknown, porDefecto: string): string {
  return err instanceof Error ? err.message : porDefecto;
}

export function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoPerfil[]>([]);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(true);
  const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getPerfil()
      .then((datos) => {
        if (activo) setPerfil(datos);
      })
      .catch((err: unknown) => {
        if (activo) setErrorPerfil(mensaje(err, 'No se pudo obtener tu perfil.'));
      });
    getMiDocumentacion()
      .then((datos) => {
        if (activo) setDocumentos(datos);
      })
      .catch((err: unknown) => {
        if (activo) setErrorDocumentos(mensaje(err, 'No se pudo obtener tu documentación.'));
      })
      .finally(() => {
        if (activo) setCargandoDocumentos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Mi perfil</h2>
      {errorPerfil && <ErrorAlert mensaje={errorPerfil} />}
      {!perfil && !errorPerfil && <LoadingSpinner mensaje="Cargando perfil..." />}
      {perfil && (
        <Row className="g-4">
          <Col lg={7}>
            <DatosPerfil perfil={perfil} onActualizado={setPerfil} />
          </Col>
          <Col lg={5}>
            <CambiarPasswordForm />
          </Col>
          <Col xs={12}>
            <MiDocumentacion
              documentos={documentos}
              cargando={cargandoDocumentos}
              error={errorDocumentos}
            />
          </Col>
        </Row>
      )}
    </Container>
  );
}

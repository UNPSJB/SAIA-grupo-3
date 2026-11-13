import { useState } from 'react';
import { Alert, Badge, Button, Container, Tab, Tabs } from 'react-bootstrap';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuth } from '../../shared/hooks/useAuth';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { getReceta, getVersion } from './recetaApi';
import type { Receta, Version } from './types';
import { ComposicionVersion } from './ComposicionVersion';
import { EscaladoReceta } from './EscaladoReceta';
import { HistorialVersiones } from './HistorialVersiones';
import { ListaIngredientesVersion } from './ListaIngredientesVersion';
import { VersionDetalle } from './VersionDetalle';

async function cargar(
  recetaId: number,
  versionId: number | null,
): Promise<{ receta: Receta; version: Version }> {
  const receta = await getReceta(recetaId);
  if (versionId === null || versionId === receta.version_vigente.id) {
    return { receta, version: receta.version_vigente };
  }
  const version = await getVersion(versionId);
  if (version.receta_id !== receta.id) throw new Error('La versión no pertenece a esta receta.');
  return { receta, version };
}

export function RecetaDetallePage() {
  const { id, versionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const recetaId = Number(id);
  const versionElegida = versionId ? Number(versionId) : null;
  const consulta = useConsulta(() => cargar(recetaId, versionElegida), [recetaId, versionElegida]);
  const mensaje = (location.state as { mensaje?: string } | null)?.mensaje;
  const [verHistorial, setVerHistorial] = useState(false);
  const [verEscalado, setVerEscalado] = useState(false);
  const [pestana, setPestana] = useState('receta');

  if (consulta.error) {
    return (
      <Container className="py-2">
        <ErrorAlert mensaje={consulta.error} />
        <Button onClick={() => navigate('/recetas')}>Volver a recetas</Button>
      </Container>
    );
  }
  if (!consulta.datos) {
    return <LoadingSpinner mensaje="Cargando receta..." />;
  }

  const { receta, version } = consulta.datos;
  const esVigente = version.estado === 'vigente';
  const puedeModificar = currentUser?.administrar === true && esVigente && receta.producto.activo;
  const mostrarHistorial = verHistorial || !esVigente;
  const puedeEscalar = esVigente && receta.producto.activo;

  return (
    <Container className="py-2">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 border-bottom pb-2">
        <div>
          <h2 className="text-secondary mb-1">{receta.producto.nombre}</h2>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Badge bg={esVigente ? 'success' : 'secondary'}>
              Versión {version.numero} · {esVigente ? 'vigente' : 'archivada'}
            </Badge>
            <span className="small text-body-secondary">
              {formatearFechaHora(version.fecha_creacion)} por {version.creado_por.nombre}{' '}
              {version.creado_por.apellido} · {version.motivo}
            </span>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" onClick={() => navigate('/recetas')}>
            Volver
          </Button>
          {puedeEscalar && (
            <Button
              variant={verEscalado ? 'primary' : 'outline-primary'}
              aria-expanded={verEscalado}
              onClick={() => setVerEscalado(!verEscalado)}
            >
              <i className="bi bi-calculator me-1" aria-hidden="true" />
              Escalar a mi lote
            </Button>
          )}
          {receta.cantidad_versiones > 1 && (
            <Button
              variant="outline-primary"
              aria-expanded={mostrarHistorial}
              onClick={() => setVerHistorial(!mostrarHistorial)}
            >
              <i className="bi bi-clock-history me-1" aria-hidden="true" />
              {mostrarHistorial
                ? 'Ocultar historial'
                : `Ver historial (${receta.cantidad_versiones})`}
            </Button>
          )}
          {puedeModificar && (
            <Button
              variant="warning"
              className="text-white"
              onClick={() => navigate(`/recetas/${receta.id}/nueva-version`)}
            >
              <i className="bi bi-pencil-fill me-1" aria-hidden="true" />
              Modificar (nueva versión)
            </Button>
          )}
        </div>
      </div>

      {mensaje && esVigente && (
        <Alert variant="success" className="py-2">
          {mensaje}
        </Alert>
      )}
      {!esVigente && (
        <Alert
          variant="secondary"
          className="d-flex flex-wrap align-items-center justify-content-between gap-2"
        >
          <span>
            <i className="bi bi-lock-fill me-2" aria-hidden="true" />
            Estás viendo una versión archivada. Es de solo lectura.
          </span>
          <Link to={`/recetas/${receta.id}`}>Ir a la versión vigente</Link>
        </Alert>
      )}

      {mostrarHistorial && <HistorialVersiones recetaId={receta.id} versionActualId={version.id} />}
      {puedeEscalar && verEscalado && <EscaladoReceta recetaId={receta.id} version={version} />}
      {currentUser?.administrar ? (
        <Tabs
          id="receta-pestanas"
          activeKey={pestana}
          onSelect={(clave) => setPestana(clave ?? 'receta')}
          className="mb-4"
          mountOnEnter
        >
          <Tab eventKey="receta" title="Receta">
            <VersionDetalle version={version} />
          </Tab>
          <Tab eventKey="composicion" title="Composición">
            <ComposicionVersion versionId={version.id} />
          </Tab>
          <Tab eventKey="lista" title="Lista de ingredientes">
            <ListaIngredientesVersion
              versionId={version.id}
              editable={esVigente}
              onVerComposicion={() => setPestana('composicion')}
            />
          </Tab>
        </Tabs>
      ) : (
        <VersionDetalle version={version} />
      )}
    </Container>
  );
}

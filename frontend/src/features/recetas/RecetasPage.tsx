import { useState } from 'react';
import { Badge, Button, Card, Container, Form, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { ListControls } from '../../shared/components/ListControls';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { useDebouncedValue } from '../../shared/hooks/useListState';
import { useAuth } from '../../shared/hooks/useAuth';
import { formatearFecha } from '../../shared/libreria/fechas';
import { listarRecetas } from './recetaApi';
import { RecetasVigentes } from './RecetasVigentes';

export function RecetasPage() {
  const { currentUser } = useAuth();
  return currentUser?.administrar ? <RecetasAdministracion /> : <RecetasVigentes />;
}

function RecetasAdministracion() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const buscar = useDebouncedValue(busqueda);
  const recetas = useConsulta(
    () => listarRecetas(buscar, mostrarInactivos),
    [buscar, mostrarInactivos],
  );
  const filas = recetas.datos ?? [];

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Recetas</h2>
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Recetas por producto">
        <Form.Check
          id="recetas-productos-inactivos"
          type="switch"
          label="Ver productos dados de baja"
          checked={mostrarInactivos}
          onChange={(e) => setMostrarInactivos(e.target.checked)}
        />
      </ListControls>
      {recetas.error && <ErrorAlert mensaje={recetas.error} />}
      {recetas.cargando && !recetas.datos && <LoadingSpinner mensaje="Cargando recetas..." />}
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive striped hover className="mb-0 align-middle">
            <thead className="table-theme">
              <tr>
                <th>Producto</th>
                <th>Receta</th>
                <th>Última modificación</th>
                <th className="text-center" style={{ width: '220px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ producto, receta_id, version_vigente }) => (
                <tr key={producto.id}>
                  <td>
                    <div className="fw-semibold">{producto.nombre}</div>
                    {!producto.activo && (
                      <Badge bg="secondary" className="mt-1">
                        Producto dado de baja
                      </Badge>
                    )}
                  </td>
                  <td>
                    {version_vigente ? (
                      <Badge bg="success">Versión {version_vigente.numero} vigente</Badge>
                    ) : (
                      <Badge bg="warning" text="dark">
                        Sin receta
                      </Badge>
                    )}
                  </td>
                  <td className="small text-body-secondary">
                    {version_vigente
                      ? `${formatearFecha(version_vigente.fecha_creacion)} · ${version_vigente.motivo}`
                      : '—'}
                  </td>
                  <td className="text-center">
                    <div className="d-flex justify-content-center flex-wrap gap-2">
                      {receta_id && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => navigate(`/recetas/${receta_id}`)}
                        >
                          <i className="bi bi-eye-fill me-1" aria-hidden="true" />
                          Ver
                        </Button>
                      )}
                      {receta_id && producto.activo && (
                        <Button
                          size="sm"
                          variant="warning"
                          className="text-white"
                          onClick={() => navigate(`/recetas/${receta_id}/nueva-version`)}
                        >
                          <i className="bi bi-pencil-fill me-1" aria-hidden="true" />
                          Modificar
                        </Button>
                      )}
                      {!receta_id && producto.activo && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => navigate(`/recetas/nueva?producto=${producto.id}`)}
                        >
                          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                          Crear receta
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!recetas.cargando && filas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    No hay productos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

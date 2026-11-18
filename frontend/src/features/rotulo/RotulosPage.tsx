import { useState } from 'react';
import { Badge, Button, Card, Container, Form, ProgressBar, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { crearBorrador, listarRotulos } from './rotuloApi';

export function RotulosPage() {
  const navigate = useNavigate();
  const consulta = useConsulta(listarRotulos, []);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState<number | null>(null);

  const crear = async (productoId: number) => {
    setCreando(productoId);
    setError(null);
    try {
      await crearBorrador(productoId);
      navigate(`/rotulado/${productoId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el borrador.');
      setCreando(null);
    }
  };

  const filas = (consulta.datos ?? []).filter((fila) =>
    fila.producto.nombre.toLowerCase().includes(buscar.trim().toLowerCase()),
  );

  return (
    <Container className="py-2">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center border-bottom pb-2 mb-3">
        <h2 className="text-secondary mb-0">Rotulado</h2>
        <Form.Control
          aria-label="Buscar producto"
          placeholder="Buscar producto"
          style={{ maxWidth: '18rem' }}
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>
      <p className="small text-body-secondary">
        Borradores de rótulo según el Capítulo V del Código Alimentario Argentino. Los datos que el
        sistema ya tiene (lista de ingredientes, información nutricional, sellos y lote) se
        completan solos.
      </p>
      {consulta.error && <ErrorAlert mensaje={consulta.error} />}
      {error && <ErrorAlert mensaje={error} />}
      {!consulta.datos && !consulta.error && <LoadingSpinner mensaje="Cargando rótulos..." />}
      {consulta.datos && (
        <Card className="shadow-sm border-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr className="small text-body-secondary">
                <th className="ps-3">Producto</th>
                <th style={{ minWidth: '12rem' }}>Completitud</th>
                <th>Actualizado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.producto.id}>
                  <td className="ps-3 fw-semibold">
                    {fila.producto.nombre}
                    {!fila.producto.activo && (
                      <Badge bg="secondary" className="ms-2 fw-normal">
                        Inactivo
                      </Badge>
                    )}
                  </td>
                  <td>
                    {fila.porcentaje === null ? (
                      <span className="small text-body-secondary">Sin borrador</span>
                    ) : (
                      <>
                        <ProgressBar
                          now={fila.porcentaje}
                          variant={fila.porcentaje === 100 ? 'success' : 'warning'}
                          style={{ height: '0.6rem' }}
                          aria-label={`${fila.porcentaje} % completo`}
                        />
                        <div className="small text-body-secondary mt-1">
                          {fila.porcentaje} %
                          {fila.faltantes > 0 &&
                            ` · ${fila.faltantes === 1 ? 'falta 1 dato' : `faltan ${fila.faltantes} datos`}`}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="small text-body-secondary text-nowrap">
                    {fila.actualizado_en ? formatearFechaHora(fila.actualizado_en) : '—'}
                  </td>
                  <td className="text-end pe-3">
                    {fila.borrador_id ? (
                      <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => navigate(`/rotulado/${fila.producto.id}/vista-previa`)}
                        >
                          Vista previa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => navigate(`/rotulado/${fila.producto.id}`)}
                        >
                          Abrir
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => crear(fila.producto.id)}
                        disabled={creando !== null}
                      >
                        {creando === fila.producto.id ? 'Creando...' : 'Crear borrador'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </Container>
  );
}

import { useState } from 'react';
import { Badge, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { useDebouncedValue } from '../../shared/hooks/useListState';
import { formatearFecha } from '../../shared/libreria/fechas';
import { listarRecetasVigentes } from './recetaApi';

export function RecetasVigentes() {
  const [busqueda, setBusqueda] = useState('');
  const buscar = useDebouncedValue(busqueda);
  const recetas = useConsulta(() => listarRecetasVigentes(buscar), [buscar]);
  const tarjetas = recetas.datos ?? [];

  return (
    <Container className="py-2">
      <h2 className="mb-1 text-secondary">Recetas</h2>
      <p className="text-body-secondary mb-4 border-bottom pb-3">
        Consultá la versión vigente antes de elaborar.
      </p>
      <Form.Control
        type="search"
        size="lg"
        className="mb-4"
        aria-label="Buscar producto"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
      />
      {recetas.error && <ErrorAlert mensaje={recetas.error} />}
      {recetas.cargando && !recetas.datos && <LoadingSpinner mensaje="Cargando recetas..." />}
      {!recetas.cargando && tarjetas.length === 0 && (
        <p className="text-center text-body-secondary py-5">
          {buscar
            ? 'No hay recetas que coincidan con la búsqueda.'
            : 'Todavía no hay recetas vigentes.'}
        </p>
      )}
      <Row xs={1} sm={2} xl={3} className="g-3">
        {tarjetas.map((receta) => (
          <Col key={receta.receta_id}>
            <Card className="h-100 shadow-sm receta-tarjeta">
              <Card.Body className="d-flex flex-column gap-2 p-4">
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <Card.Title as="h3" className="h5 mb-0">
                    <Link
                      to={`/recetas/${receta.receta_id}`}
                      className="stretched-link text-reset text-decoration-none"
                    >
                      {receta.producto.nombre}
                    </Link>
                  </Card.Title>
                  <Badge bg="success" className="flex-shrink-0">
                    Versión {receta.version_vigente.numero}
                  </Badge>
                </div>
                <div className="text-body-secondary">
                  {receta.cantidad_ingredientes} ingrediente
                  {receta.cantidad_ingredientes === 1 ? '' : 's'} · {receta.cantidad_pasos} paso
                  {receta.cantidad_pasos === 1 ? '' : 's'}
                </div>
                <div className="small text-body-secondary mt-auto">
                  Vigente desde {formatearFecha(receta.version_vigente.fecha_creacion)}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

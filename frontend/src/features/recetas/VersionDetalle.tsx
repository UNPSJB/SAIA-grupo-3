import { Badge, Card, Col, ListGroup, Row, Table } from 'react-bootstrap';
import { textoAditivo } from '../aditivos/aditivosApi';
import { cantidadConUnidad } from './formato';
import type { Renglon, Version } from './types';

function TablaRenglones({ renglones, aditivos }: { renglones: Renglon[]; aditivos: boolean }) {
  return (
    <Table responsive size="sm" className="mb-0 align-middle">
      <thead>
        <tr>
          <th>{aditivos ? 'Aditivo' : 'Ingrediente'}</th>
          {aditivos && <th>Clase funcional</th>}
          <th className="text-end">Cantidad</th>
        </tr>
      </thead>
      <tbody>
        {renglones.map((renglon) => (
          <tr key={renglon.id}>
            <td>
              <div>{renglon.insumo.nombre}</div>
              {aditivos && renglon.aditivo_referencia && (
                <div className="small text-body-secondary">
                  {textoAditivo(renglon.aditivo_referencia)}
                </div>
              )}
            </td>
            {aditivos && <td>{renglon.aditivo_referencia?.clase_funcional.nombre ?? '—'}</td>}
            <td className="text-end text-nowrap">
              {cantidadConUnidad(renglon.cantidad, renglon.unidad_medida.sufijo)}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function VersionDetalle({ version }: { version: Version }) {
  const ingredientes = version.renglones.filter((renglon) => renglon.tipo === 'ingrediente');
  const aditivos = version.renglones.filter((renglon) => renglon.tipo === 'aditivo');

  return (
    <Row className="g-4">
      <Col lg={5}>
        <Card className="shadow-sm h-100">
          <Card.Header className="bg-body fw-semibold">Rendimiento y porción</Card.Header>
          <Card.Body>
            <div className="small text-body-secondary">Rendimiento final</div>
            <div className="fs-5 fw-semibold mb-3">
              {cantidadConUnidad(version.rendimiento_cantidad, version.rendimiento_unidad.sufijo)}
            </div>
            <div className="small text-body-secondary">Porción o unidad de venta</div>
            <div className="fw-semibold">
              {version.porcion_cantidad && version.porcion_unidad
                ? cantidadConUnidad(version.porcion_cantidad, version.porcion_unidad.sufijo)
                : 'No indicada'}
              {version.porcion_medida_casera && (
                <span className="text-body-secondary fw-normal">
                  {' '}
                  ({version.porcion_medida_casera})
                </span>
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={7}>
        <Card className="shadow-sm h-100">
          <Card.Header className="bg-body fw-semibold">
            Ingredientes <Badge bg="secondary">{ingredientes.length}</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <TablaRenglones renglones={ingredientes} aditivos={false} />
          </Card.Body>
        </Card>
      </Col>
      {aditivos.length > 0 && (
        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-body fw-semibold">
              Aditivos <Badge bg="secondary">{aditivos.length}</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <TablaRenglones renglones={aditivos} aditivos />
            </Card.Body>
          </Card>
        </Col>
      )}
      <Col xs={12}>
        <Card className="shadow-sm">
          <Card.Header className="bg-body fw-semibold">Pasos de elaboración</Card.Header>
          {version.pasos.length === 0 ? (
            <Card.Body className="text-body-secondary">
              Esta versión no tiene pasos cargados.
            </Card.Body>
          ) : (
            <ListGroup variant="flush" as="ol">
              {version.pasos.map((paso) => (
                <ListGroup.Item as="li" key={paso.id} className="d-flex gap-3">
                  <span className="fw-bold text-body-secondary">{paso.orden}.</span>
                  <div className="flex-grow-1">
                    <div className="fw-semibold d-flex flex-wrap align-items-center gap-2">
                      {paso.nombre}
                      {paso.punto_control && (
                        <Badge bg="danger">
                          <i className="bi bi-shield-exclamation me-1" aria-hidden="true" />
                          Punto de control
                        </Badge>
                      )}
                    </div>
                    <div className="small">{paso.procedimiento}</div>
                    <div className="small text-body-secondary d-flex flex-wrap column-gap-3 mt-1">
                      {paso.equipo && <span>Equipo: {paso.equipo.nombre}</span>}
                      {paso.tiempo_minutos && <span>Tiempo: {paso.tiempo_minutos} min</span>}
                      {paso.temperatura_celsius !== null && (
                        <span>Temperatura: {paso.temperatura_celsius} °C</span>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card>
      </Col>
    </Row>
  );
}

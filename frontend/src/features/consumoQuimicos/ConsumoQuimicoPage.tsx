import { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { ConsumoQuimicoList } from './ConsumoQuimicoList';
import { ConsumoQuimicoForm } from './ConsumoQuimicoForm';
import { ConsumoQuimicoView } from './ConsumoQuimicoView';
import { ConsumoQuimicoDeleteView } from './ConsumoQuimicoDeleteView';
import { useConsumoQuimico } from './useConsumoQuimico';
import type { ConsumoQuimico } from './types';
import { Table, Form, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { getReporteAcumulado } from './consumoQuimicoApi';
import type { ConsumoAcumulado } from './consumoQuimicoApi';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function ConsumoQuimicoPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [consumoSeleccionado, setConsumoSeleccionado] = useState<ConsumoQuimico | null>(null);
  const { guardarConsumo, eliminarConsumo } = useConsumoQuimico();

  const handleNuevo = () => {
    setConsumoSeleccionado(null);
    setModo('crear');
  };

  const handleView = (consumo: ConsumoQuimico) => {
    setConsumoSeleccionado(consumo);
    setModo('ver');
  };

  const handleEditar = (consumo: ConsumoQuimico) => {
    setConsumoSeleccionado(consumo);
    setModo('editar');
  };

  const handleEliminarClick = (consumo: ConsumoQuimico) => {
    setConsumoSeleccionado(consumo);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: ConsumoQuimico) => {
    if (modo === 'editar' && consumoSeleccionado?.id) {
      await guardarConsumo(datos, consumoSeleccionado.id);
    } else {
      await guardarConsumo(datos);
    }
    volverAlListado();
  };

  const handleConfirmarBaja = async (id: number) => {
    await eliminarConsumo(id);
    volverAlListado();
  };

  const volverAlListado = () => {
    setModo('listado');
    setConsumoSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Higiene (POES)</h2>

      {modo === 'ver' && consumoSeleccionado && (
        <ConsumoQuimicoView
          consumo={consumoSeleccionado}
          onEditar={() => handleEditar(consumoSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <ConsumoQuimicoList
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <ConsumoQuimicoForm
          consumoInicial={consumoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && consumoSeleccionado && (
        <ConsumoQuimicoDeleteView
          consumo={consumoSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}

export function ReporteConsumosPage() {
  const [reporte, setReporte] = useState<ConsumoAcumulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    cargarReporte();
  }, [fechaDesde, fechaHasta]); 

  const cargarReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReporteAcumulado(fechaDesde, fechaHasta);
      setReporte(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-4 border-bottom pb-2 text-secondary">
          Reporte de Consumo de Insumos
        </h2>
      </div>

      <Card className="shadow-sm border-0 mb-4 bg-white">
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="small text-muted fw-medium mb-1">Fecha Desde</Form.Label>
                <Form.Control 
                  type="date" 
                  value={fechaDesde} 
                  onChange={(e) => setFechaDesde(e.target.value)} 
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="small text-muted fw-medium mb-1">Fecha Hasta</Form.Label>
                <Form.Control 
                  type="date" 
                  value={fechaHasta} 
                  onChange={(e) => setFechaHasta(e.target.value)} 
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={4} className="d-flex align-items-end mt-4">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                disabled={!fechaDesde && !fechaHasta}
              >
                Limpiar Filtros
              </button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 bg-white">
        <Card.Body className="p-0">
          {error && <Alert variant="danger" className="m-3">{error}</Alert>}
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Calculando consumos...</p>
            </div>
          ) : reporte.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 mb-3 d-block text-secondary"></i>
              No hay consumos registrados en este período.
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3 text-secondary fw-semibold">ID</th>
                  <th className="py-3 text-secondary fw-semibold">Producto Químico</th>
                  <th className="py-3 text-end text-secondary fw-semibold">Total Consumido</th>
                  <th className="px-4 py-3 text-secondary fw-semibold">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {reporte.map((item) => (
                  <tr key={item.insumo_id}>
                    <td className="px-4 text-muted">#{item.insumo_id}</td>
                    <td className="fw-medium text-dark">{item.nombre_insumo}</td>
                    <td className="text-end fw-bold text-primary fs-5">
                      {item.cantidad_total.toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 text-muted">{item.unidad_medida}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
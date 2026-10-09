import { SortableHeader } from '../../shared/components/SortableHeader';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { getConsumoById } from './consumoQuimicoApi';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { useSearchParams } from 'react-router-dom';
import { useListState, useDebouncedValue } from '../../shared/hooks/useListState';
import { ListControls } from '../../shared/components/ListControls';
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

export function ConsumoQuimicoPage() {
  const route = useCrudRoute('/consumos', getConsumoById);
  const { mode: modo, item: consumoSeleccionado } = route;
  const { guardarConsumo, eliminarConsumo } = useConsumoQuimico(false);
  const handleNuevo = () => route.open();
  const handleView = (item: ConsumoQuimico) => route.open(item);
  const handleEditar = (item: ConsumoQuimico) => route.open(item, 'editar');
  const handleEliminarClick = (item: ConsumoQuimico) => route.open(item, 'eliminar');
  const volverAlListado = route.back;
  const handleGuardar = async (datos: ConsumoQuimico) => {
    await guardarConsumo(datos, modo === 'editar' ? consumoSeleccionado?.id : undefined);
    route.back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminarConsumo(id);
    route.back();
  };
  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Higiene (POES)</h2>
      {route.loading && <LoadingSpinner mensaje="Cargando consumo..." />}
      {route.error && (
        <>
          <ErrorAlert mensaje={route.error} />
          <button className="btn btn-secondary" onClick={route.back}>
            Volver
          </button>
        </>
      )}

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

      {(modo === 'crear' || (modo === 'editar' && consumoSeleccionado)) && (
        <ConsumoQuimicoForm
          key={consumoSeleccionado?.id ?? 'nuevo'}
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

  const [params] = useSearchParams();
  const filters = useListState('nombre_insumo');
  const fechaDesde = params.get('fecha_desde') || '';
  const fechaHasta = params.get('fecha_hasta') || '';
  const setFechaDesde = (value: string) => filters.update({ fecha_desde: value });
  const setFechaHasta = (value: string) => filters.update({ fecha_hasta: value });
  const search = useDebouncedValue(filters.busqueda);
  const { ordenarPor, orden, busqueda } = filters;

  useEffect(() => {
    if (search !== busqueda) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getReporteAcumulado(fechaDesde, fechaHasta, search, ordenarPor, orden);
        if (active) {
          setReporte(data);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar el reporte.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [fechaDesde, fechaHasta, search, busqueda, ordenarPor, orden]);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-4 border-bottom pb-2 text-secondary">Reporte de Consumo de Insumos</h2>
      </div>

      <ListControls {...filters} />
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
                onClick={() => filters.update({ fecha_desde: '', fecha_hasta: '', buscar: '' })}
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
          {error && (
            <Alert variant="danger" className="m-3">
              {error}
            </Alert>
          )}

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
                  <SortableHeader column="insumo_id" {...filters}>
                    ID
                  </SortableHeader>
                  <SortableHeader column="nombre_insumo" {...filters}>
                    Producto Químico
                  </SortableHeader>
                  <SortableHeader column="cantidad_total" {...filters}>
                    Total Consumido
                  </SortableHeader>
                  <SortableHeader column="unidad_medida" {...filters}>
                    Unidad
                  </SortableHeader>
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

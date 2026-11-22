import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Container, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { formatearFecha } from '../../shared/libreria/fechas';
import { CodigoBarras } from './CodigoBarras';
import { EstadoLoteBadge } from './EstadoLoteBadge';
import { formatearCantidad } from './formato';
import { buscarLotePorCodigo } from './loteProduccionApi';
import type { LoteProduccion } from './types';

export function BuscarLotePage() {
  const { currentUser } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [lote, setLote] = useState<LoteProduccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esAdministrador = currentUser?.administrar === true;

  const buscar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!codigo.trim()) {
      setLote(null);
      setError('Ingresá el código de barras o el código del lote.');
      return;
    }
    setBuscando(true);
    setError(null);
    try {
      setLote(await buscarLotePorCodigo(codigo.trim()));
    } catch (err) {
      setLote(null);
      setError(err instanceof Error ? err.message : 'No se pudo buscar el lote.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Buscar lote por código</h2>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
          <Form onSubmit={buscar} noValidate>
            <Form.Label htmlFor="codigo-lote" className="fw-semibold">
              Código de barras o código del lote
            </Form.Label>
            <InputGroup size="lg">
              <InputGroup.Text>
                <i className="bi bi-upc" aria-hidden="true"></i>
              </InputGroup.Text>
              <Form.Control
                id="codigo-lote"
                className="font-monospace"
                autoComplete="off"
                autoFocus
                maxLength={40}
                placeholder="Ej.: 2026112200013 o L-20261122-001"
                value={codigo}
                onChange={(evento) => setCodigo(evento.target.value)}
              />
              <Button type="submit" variant="primary" disabled={buscando}>
                {buscando ? (
                  <Spinner animation="border" size="sm" role="status" aria-label="Buscando" />
                ) : (
                  <>
                    <i className="bi bi-search me-1" aria-hidden="true"></i> Buscar
                  </>
                )}
              </Button>
            </InputGroup>
            <Form.Text>
              Escribí los números que aparecen debajo del código de barras en la etiqueta.
            </Form.Text>
          </Form>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>{error}</span>
        </Alert>
      )}

      {!error && !lote && (
        <p className="text-muted small py-4 text-center border rounded bg-body mb-0">
          Ingresá un código para ver el lote.
        </p>
      )}

      {lote && (
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-body-tertiary text-secondary d-flex align-items-center gap-2 py-3">
            <i className="bi bi-box-seam fs-5" aria-hidden="true"></i>
            <h5 className="mb-0">Lote {lote.codigo}</h5>
            <span className="ms-auto">
              <EstadoLoteBadge estado={lote.estado} />
            </span>
          </Card.Header>
          <Card.Body className="p-4">
            <div className="d-flex flex-wrap align-items-center gap-4">
              <div
                className="bg-body-tertiary p-3 rounded border"
                style={{ flex: '999 1 380px', minWidth: 0 }}
              >
                <div className="row mb-2">
                  <span className="col-sm-4 text-muted fw-semibold">Producto:</span>
                  <span className="col-sm-8">{lote.producto.nombre}</span>
                </div>
                <div className="row mb-2">
                  <span className="col-sm-4 text-muted fw-semibold">Fecha de producción:</span>
                  <span className="col-sm-8">{formatearFecha(lote.fecha_produccion)}</span>
                </div>
                <div className="row mb-2">
                  <span className="col-sm-4 text-muted fw-semibold">Cantidad:</span>
                  <span className="col-sm-8">
                    {formatearCantidad(lote.cantidad)} {lote.producto.unidad_medida.sufijo}
                  </span>
                </div>
                <div className="row">
                  <span className="col-sm-4 text-muted fw-semibold">Registrado por:</span>
                  <span className="col-sm-8">
                    {lote.registrado_por.apellido}, {lote.registrado_por.nombre}
                  </span>
                </div>
              </div>
              {lote.codigo_barras && (
                <div className="border rounded bg-white flex-shrink-0">
                  <CodigoBarras codigo={lote.codigo_barras} alto={56} />
                </div>
              )}
            </div>
          </Card.Body>
          <Card.Footer className="bg-body border-top-0 d-flex flex-wrap justify-content-end gap-2 pb-4 px-4">
            <Link
              to={esAdministrador ? `/lotes/${lote.id}` : `/lotes-produccion/${lote.id}`}
              className="btn btn-secondary"
            >
              Ver detalle del lote
            </Link>
            {esAdministrador && (
              <Link to={`/lotes/${lote.id}/expediente`} className="btn btn-primary">
                <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true"></i> Expediente de
                trazabilidad
              </Link>
            )}
          </Card.Footer>
        </Card>
      )}
    </Container>
  );
}

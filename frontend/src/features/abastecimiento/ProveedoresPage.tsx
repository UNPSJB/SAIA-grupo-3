import { useCallback, useState } from 'react';
import './ProveedoresPage.css';
import { Alert, Badge, Button, Card, Container, Form, Table } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { formatearFecha } from '../../shared/libreria/fechas';
import {
  cambiarEstadoProveedor,
  guardarProveedor,
  listarProveedores,
  obtenerProveedor,
} from './abastecimientoApi';
import { ConfirmacionAbastecimiento } from './ConfirmacionAbastecimiento';
import { EstadoLote } from './EstadoLote';
import { ProveedorForm } from './ProveedorForm';
import { ProveedorLotes } from './ProveedorLotes';
import type { Proveedor, ProveedorInput } from './types';
import { useConsulta } from './useConsulta';

interface ListadoProps {
  onNuevo: () => void;
  onVer: (proveedor: Proveedor) => void;
  onEditar: (proveedor: Proveedor) => void;
  onEstado: (proveedor: Proveedor) => void;
}

function ProveedoresListado({ onNuevo, onVer, onEditar, onEstado }: ListadoProps) {
  const [params, setParams] = useSearchParams();
  const consulta = params.toString();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const cargar = useCallback(
    (signal: AbortSignal) =>
      listarProveedores(Object.fromEntries(new URLSearchParams(consulta)), signal),
    [consulta],
  );
  const listado = useConsulta(cargar);
  function filtrar(clave: string, valor: string) {
    setParams(
      (anteriores) => {
        const nuevos = new URLSearchParams(anteriores);
        if (valor) nuevos.set(clave, valor);
        else nuevos.delete(clave);
        if (clave !== 'page') nuevos.set('page', '1');
        return nuevos;
      },
      { replace: true },
    );
  }
  return (
    <>
      <ListControls
        title="Nómina de Proveedores"
        busqueda={params.get('buscar') ?? ''}
        setBusqueda={(valor) => filtrar('buscar', valor)}
      >
        <Form.Check
          type="switch"
          id="proveedores-inactivos"
          label="Ver dados de baja"
          checked={params.get('mostrar_inactivos') === 'true'}
          onChange={(e) => filtrar('mostrar_inactivos', String(e.target.checked))}
        />
        <Button
          variant="success"
          onClick={onNuevo}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
          Nuevo Proveedor
        </Button>
      </ListControls>
      {listado.error && <ErrorAlert mensaje={listado.error} />}
      {listado.cargando && <LoadingSpinner mensaje="Cargando listado..." />}
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive striped hover className="mb-0 align-middle proveedores-table">
            <thead className="table-theme">
              <tr>
                <th>Proveedor</th>
                <th className="text-center">CUIT</th>
                <th>Contacto</th>
                <th>Habilitación</th>
                <th className="text-center">Estado</th>
                <th className="text-center" style={{ width: '160px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {listado.datos?.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="proveedor-nombre">{p.nombre}</span>
                  </td>
                  <td className="text-nowrap text-center">{p.cuit}</td>
                  <td>
                    <div>{p.telefono || 'Sin teléfono'}</div>
                    <small
                      className="proveedor-email text-body-secondary"
                      title={p.email || undefined}
                    >
                      {p.email || 'Sin email'}
                    </small>
                  </td>
                  <td>
                    <div>{p.numero_habilitacion || 'Sin registrar'}</div>
                    <div className="proveedor-habilitacion">
                      {p.vencimiento_habilitacion && (
                        <small className="text-body-secondary">
                          {formatearFecha(p.vencimiento_habilitacion)}
                        </small>
                      )}
                      {p.habilitacion_estado && <EstadoLote estado={p.habilitacion_estado} />}
                    </div>
                  </td>
                  <td className="text-center">
                    <Badge bg={p.activo ? 'success' : 'danger'}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex justify-content-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        className="py-1 px-2 shadow-sm"
                        title="Ver detalle"
                        aria-label={`Ver detalle de ${p.nombre}`}
                        onClick={() => onVer(p)}
                      >
                        <i className="bi bi-eye-fill" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant="warning"
                        className="text-white py-1 px-2 shadow-sm"
                        title="Editar"
                        aria-label={`Editar ${p.nombre}`}
                        onClick={() => onEditar(p)}
                      >
                        <i className="bi bi-pencil-fill" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant={p.activo ? 'danger' : 'success'}
                        className="py-1 px-2 shadow-sm"
                        title={p.activo ? 'Dar de baja' : 'Reactivar'}
                        aria-label={`${p.activo ? 'Dar de baja' : 'Reactivar'} ${p.nombre}`}
                        onClick={() => onEstado(p)}
                      >
                        <i
                          className={`bi ${p.activo ? 'bi-trash-fill' : 'bi-arrow-counterclockwise'}`}
                          aria-hidden="true"
                        />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!listado.cargando && !listado.datos?.items.length && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No hay proveedores para estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
        {(listado.datos?.pages ?? 0) > 0 && (
          <Card.Footer className="bg-body border-top">
            <ListPagination
              page={page}
              totalPages={listado.datos?.pages ?? 0}
              total={listado.datos?.total ?? 0}
              changePage={(valor) => filtrar('page', String(valor))}
            />
          </Card.Footer>
        )}
      </Card>
    </>
  );
}

export function ProveedoresPage() {
  const { mode, item, open, back, error, loading } = useCrudRoute<Proveedor>(
    '/proveedores',
    obtenerProveedor,
  );
  const [mensaje, setMensaje] = useState('');
  function abrir(proveedor?: Proveedor, accion?: 'editar' | 'eliminar') {
    setMensaje('');
    open(proveedor, accion);
  }
  async function guardar(datos: ProveedorInput) {
    await guardarProveedor(datos, mode === 'editar' ? item?.id : undefined);
    setMensaje('El proveedor se guardó correctamente.');
    back();
  }
  async function confirmarEstado() {
    if (!item) return;
    await cambiarEstadoProveedor(item.id, !item.activo);
    setMensaje('El estado del proveedor se actualizó.');
    back();
  }
  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Proveedores</h2>
      {mensaje && mode === 'listado' && (
        <Alert variant="success" role="status">
          {mensaje}
        </Alert>
      )}
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <ProveedoresListado
          onNuevo={() => abrir()}
          onVer={(p) => abrir(p)}
          onEditar={(p) => abrir(p, 'editar')}
          onEstado={(p) => abrir(p, 'eliminar')}
        />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <ProveedorForm
          key={item?.id ?? 'nuevo'}
          inicial={mode === 'crear' ? null : item}
          onGuardar={guardar}
          onCancelar={back}
        />
      )}
      {mode === 'ver' && item && (
        <>
          <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
            <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
              <i className="bi bi-truck me-2" aria-hidden="true" />
              Detalle del Proveedor
            </Card.Header>
            <Card.Body className="p-4">
              <div className="bg-body-tertiary p-3 rounded border">
                {[
                  ['Nombre', item.nombre],
                  ['CUIT', item.cuit],
                  ['Teléfono', item.telefono || 'Sin teléfono'],
                  ['Email', item.email || 'Sin email'],
                ].map(([label, value]) => (
                  <div className="row mb-2" key={label}>
                    <span className="col-4 text-muted fw-semibold">{label}:</span>
                    <span className="col-8 text-break">{value}</span>
                  </div>
                ))}
                <div className="row align-items-center">
                  <span className="col-4 text-muted fw-semibold">Estado:</span>
                  <span className="col-8">
                    <Badge bg={item.activo ? 'success' : 'danger'}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </span>
                </div>
              </div>
              <div
                className={`p-3 rounded border mt-3 border-${item.habilitacion_estado === 'vencido' ? 'danger' : item.habilitacion_estado === 'por_vencer' ? 'warning' : item.habilitacion_estado === 'vigente' ? 'success' : 'secondary'}`}
              >
                <h6 className="fw-semibold border-bottom pb-2 mb-3">Habilitación del Proveedor</h6>
                <div className="row mb-3">
                  <span className="col-sm-5 text-body-secondary fw-semibold">
                    Número de habilitación:
                  </span>
                  <span className="col-sm-7 text-break">
                    {item.numero_habilitacion || 'Sin registrar'}
                  </span>
                </div>
                <div className="row border-top pt-2 align-items-center">
                  <span className="col-sm-5 text-body-secondary fw-semibold">Vencimiento:</span>
                  <span className="col-sm-7">
                    {item.vencimiento_habilitacion ? (
                      <Badge
                        bg={
                          item.habilitacion_estado === 'vencido'
                            ? 'danger'
                            : item.habilitacion_estado === 'por_vencer'
                              ? 'warning'
                              : item.habilitacion_estado === 'vigente'
                                ? 'success'
                                : 'secondary'
                        }
                        text={item.habilitacion_estado === 'por_vencer' ? 'dark' : undefined}
                        className="fw-normal"
                      >
                        {formatearFecha(item.vencimiento_habilitacion)}
                        {item.habilitacion_estado &&
                          ` (${item.habilitacion_estado === 'vencido' ? 'Vencida' : item.habilitacion_estado === 'por_vencer' ? 'Próxima a vencer' : 'Vigente'})`}
                      </Badge>
                    ) : (
                      <span className="text-body-secondary">Sin registrar</span>
                    )}
                  </span>
                </div>
              </div>
            </Card.Body>
            <Card.Footer className="bg-body border-top-0 d-flex flex-wrap justify-content-end gap-2 pb-4 px-4">
              <Button variant="secondary" onClick={back}>
                Volver
              </Button>
              <Button
                variant="warning"
                className="text-white"
                onClick={() => abrir(item, 'editar')}
              >
                Editar
              </Button>
            </Card.Footer>
          </Card>
          <ProveedorLotes key={item.id} proveedorId={item.id} />
        </>
      )}
      {mode === 'eliminar' && item && (
        <ConfirmacionAbastecimiento
          key={item.id}
          titulo={item.activo ? 'Dar de Baja Proveedor' : 'Reactivar Proveedor'}
          descripcion={
            item.activo
              ? 'No se podrán registrar nuevas recepciones de este proveedor. Sus recepciones anteriores se conservan.'
              : 'El proveedor volverá a estar disponible para registrar recepciones. Sus datos e historial se conservan.'
          }
          confirmar={item.activo ? 'Confirmar Baja' : 'Confirmar Reactivación'}
          reactivar={!item.activo}
          onConfirmar={confirmarEstado}
          onCancelar={back}
        >
          <div>
            <strong>Nombre:</strong> {item.nombre}
          </div>
          <div>
            <strong>CUIT:</strong> {item.cuit}
          </div>
        </ConfirmacionAbastecimiento>
      )}
    </Container>
  );
}

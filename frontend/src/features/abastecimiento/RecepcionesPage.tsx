import { useCallback, useState } from 'react';
import './RecepcionesPage.css';
import { Alert, Badge, Button, Card, Container, Form, InputGroup, Table } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ListPagination } from '../../shared/components/ListPagination';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { formatearFecha, textoDiasRestantes } from '../../shared/libreria/fechas';
import {
  anularLote,
  cargarOpcionesFiltros,
  listarLotes,
  obtenerLote,
  obtenerTrazabilidad,
} from './abastecimientoApi';
import { EstadoLote } from './EstadoLote';
import { RecepcionForm } from './RecepcionForm';
import { ConfirmacionAbastecimiento } from './ConfirmacionAbastecimiento';
import type { LoteRecepcion } from './types';
import { useConsulta } from './useConsulta';
function Trazabilidad({ lote }: { lote: LoteRecepcion }) {
  const cargar = useCallback(
    (signal: AbortSignal) => obtenerTrazabilidad(lote.id, signal),
    [lote.id],
  );
  const consulta = useConsulta(cargar);
  return (
    <Card className="mt-4 shadow-sm border-0 mx-auto" style={{ maxWidth: '1100px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        <i className="bi bi-diagram-3 me-2" aria-hidden="true" />
        Trazabilidad del lote
      </Card.Header>
      <Card.Body className="p-4">
        <p className="text-body-secondary">
          Producciones que utilizaron el lote <strong>{lote.numero_lote}</strong> de{' '}
          {lote.insumo_nombre}, recibido de {lote.proveedor_nombre}.
        </p>
        {consulta.cargando && <p role="status">Cargando trazabilidad...</p>}
        {consulta.error && <Alert variant="danger">{consulta.error}</Alert>}
        {consulta.datos && (
          <Table responsive>
            <thead>
              <tr>
                <th>Producción</th>
                <th>Producto</th>
                <th>Fecha</th>
                <th>Cantidad utilizada</th>
              </tr>
            </thead>
            <tbody>
              {consulta.datos.map((c) => (
                <tr key={c.lote_produccion_id}>
                  <td>
                    <Link to={`/lotes-produccion/${c.lote_produccion_id}`}>{c.codigo}</Link>
                    {!c.activo && (
                      <Badge bg="secondary" className="ms-2">
                        Dada de baja
                      </Badge>
                    )}
                  </td>
                  <td>{c.producto}</td>
                  <td>{formatearFecha(c.fecha_produccion)}</td>
                  <td>
                    {c.cantidad_utilizada} {lote.unidad}
                  </td>
                </tr>
              ))}
              {!consulta.datos.length && (
                <tr>
                  <td colSpan={4}>Este lote todavía no tiene consumos registrados.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

function RecepcionesListado({
  onVer,
  onEditar,
  onAnular,
}: {
  onVer: (lote: LoteRecepcion) => void;
  onEditar: (lote: LoteRecepcion) => void;
  onAnular: (lote: LoteRecepcion) => void;
}) {
  const [params, setParams] = useSearchParams();
  const consulta = params.toString();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const cargar = useCallback(
    (signal: AbortSignal) => listarLotes(Object.fromEntries(new URLSearchParams(consulta)), signal),
    [consulta],
  );
  const listado = useConsulta(cargar);
  const opciones = useConsulta(cargarOpcionesFiltros);
  const filtrosActivos = ['buscar', 'insumo_id', 'proveedor_id', 'estado', 'fecha_desde', 'fecha_hasta']
    .filter((clave) => Boolean(params.get(clave)?.trim())).length
    + Number(params.get('mostrar_inactivos') === 'true');
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
      {listado.error && <Alert variant="danger">{listado.error}</Alert>}
      {opciones.error && (
        <Alert variant="warning">
          {opciones.error}{' '}
          <Button variant="link" onClick={opciones.recargar}>
            Reintentar
          </Button>
        </Alert>
      )}
      <Card className="shadow-sm recepciones-listado">
        <Card.Header className="bg-body recepciones-filtros-encabezado">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <i className="bi bi-sliders" aria-hidden="true" />
            <h3 className="h6 mb-0">Buscar y filtrar recepciones</h3>
            {filtrosActivos > 0 && (
              <span className="small text-body-secondary">
                · {filtrosActivos} {filtrosActivos === 1 ? 'filtro activo' : 'filtros activos'}
              </span>
            )}
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={listado.recargar}
            disabled={listado.cargando}
          >
            <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
            Actualizar
          </Button>
        </Card.Header>
        <div className="recepciones-filtros">
          <Form.Group controlId="filtro-buscar-recepcion" className="recepciones-buscador">
            <Form.Label>Búsqueda general</Form.Label>
            <InputGroup>
              <InputGroup.Text className="bg-body text-body-secondary">
                <i className="bi bi-search" aria-hidden="true" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Buscar por insumo, proveedor o lote…"
                value={params.get('buscar') ?? ''}
                onChange={(e) => filtrar('buscar', e.target.value)}
              />
              {params.get('buscar') && (
                <Button
                  variant="outline-secondary"
                  aria-label="Borrar búsqueda"
                  onClick={() => filtrar('buscar', '')}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </Button>
              )}
            </InputGroup>
          </Form.Group>
          <Form.Group controlId="filtro-insumo">
            <Form.Label>Insumo</Form.Label>
            <Form.Select
              value={params.get('insumo_id') ?? ''}
              onChange={(e) => filtrar('insumo_id', e.target.value)}
            >
              <option value="">Todos los insumos</option>
              {params.get('insumo_id') &&
                !opciones.datos?.insumos.some((i) => String(i.id) === params.get('insumo_id')) && (
                  <option value={params.get('insumo_id') ?? ''}>Insumo seleccionado</option>
                )}
              {opciones.datos?.insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                  {i.activo === false ? ' (inactivo)' : ''}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="filtro-proveedor">
            <Form.Label>Proveedor</Form.Label>
            <Form.Select
              value={params.get('proveedor_id') ?? ''}
              onChange={(e) => filtrar('proveedor_id', e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {params.get('proveedor_id') &&
                !opciones.datos?.proveedores.some(
                  (p) => String(p.id) === params.get('proveedor_id'),
                ) && <option value={params.get('proveedor_id') ?? ''}>Proveedor seleccionado</option>}
              {opciones.datos?.proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {!p.activo ? ' (inactivo)' : ''}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="filtro-vencimiento">
            <Form.Label>Vencimiento</Form.Label>
            <Form.Select
              value={params.get('estado') ?? ''}
              onChange={(e) => filtrar('estado', e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="vigente">Vigentes</option>
              <option value="por_vencer">Próximos a vencer</option>
              <option value="vencido">Vencidos</option>
            </Form.Select>
          </Form.Group>
          <div className="recepciones-filtros-inferiores">
            <Form.Group controlId="filtro-desde">
              <Form.Label>Recibido desde</Form.Label>
              <Form.Control
                type="date"
                value={params.get('fecha_desde') ?? ''}
                onChange={(e) => filtrar('fecha_desde', e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="filtro-hasta">
              <Form.Label>Recibido hasta</Form.Label>
              <Form.Control
                type="date"
                value={params.get('fecha_hasta') ?? ''}
                onChange={(e) => filtrar('fecha_hasta', e.target.value)}
              />
            </Form.Group>
            <div className="recepciones-filtros-acciones">
              <Form.Check
                id="recepciones-anuladas"
                type="switch"
                label="Incluir anuladas"
                checked={params.get('mostrar_inactivos') === 'true'}
                onChange={(e) => filtrar('mostrar_inactivos', e.target.checked ? 'true' : '')}
              />
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  setParams({});
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                Limpiar filtros
              </Button>
            </div>
          </div>
        </div>
        <div className="recepciones-listado-titulo">
          <div className="d-flex align-items-center gap-2">
            <h3 className="h6 mb-0">Recepciones registradas</h3>
            <Badge bg="body-secondary" text="body" className="border fw-normal">
              {listado.datos?.total ?? '—'}
            </Badge>
          </div>
        </div>
        {listado.cargando ? (
          <p role="status" className="p-3 mb-0">Cargando recepciones...</p>
        ) : (
          <>
            <Card.Body className="p-0">
              <Table responsive striped hover className="align-middle mb-0 recepciones-table">
                <colgroup>
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '154px' }} />
                </colgroup>
                <thead className="table-theme">
                  <tr>
                    <th>Insumo / lote</th>
                    <th>Proveedor</th>
                    <th className="text-end">Recibido</th>
                    <th className="text-end">Disponible</th>
                    <th>Recepción</th>
                    <th>Vencimiento</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {listado.datos?.items.map((lote) => {
                    const editable = lote.activo && lote.cantidad_disponible === lote.cantidad;
                    return (
                      <tr key={lote.id}>
                        <td>
                          <strong>{lote.insumo_nombre}</strong>
                          <small className="d-block text-body-secondary">{lote.numero_lote}</small>
                          {lote.conciliacion && (
                            <Badge bg="secondary">Stock anterior identificado</Badge>
                          )}
                          {!lote.activo && <Badge bg="secondary">Anulada</Badge>}
                        </td>
                        <td>{lote.proveedor_nombre}</td>
                        <td className="text-end text-nowrap">
                          {lote.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })}{' '}
                          {lote.unidad}
                        </td>
                        <td className="text-end text-nowrap">
                          {lote.cantidad_disponible.toLocaleString('es-AR', {
                            maximumFractionDigits: 6,
                          })}{' '}
                          {lote.unidad}
                        </td>
                        <td className="text-nowrap">{formatearFecha(lote.fecha_recepcion)}</td>
                        <td>
                          <div>{formatearFecha(lote.fecha_vencimiento)}</div>
                          <EstadoLote estado={lote.estado_vencimiento} />
                          <small className="d-block text-body-secondary">
                            {textoDiasRestantes(lote.dias_restantes)}
                          </small>
                          {lote.advertencias.length > 0 && (
                            <details className="recepcion-avisos mt-1">
                              <summary className="text-danger">
                                <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                                {lote.advertencias.length === 1
                                  ? '1 advertencia'
                                  : `${lote.advertencias.length} advertencias`}
                              </summary>
                              <ul className="mb-0 mt-1 ps-3 text-danger">
                                {lote.advertencias.map((aviso) => (
                                  <li key={aviso}>{aviso}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-nowrap justify-content-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              aria-label={`Ver detalle y uso ${lote.numero_lote}`}
                              title="Ver detalle y uso"
                              className="py-1 px-2 shadow-sm"
                              onClick={() => onVer(lote)}
                            >
                              <i className="bi bi-eye-fill" aria-hidden="true" />
                            </Button>
                            <Button
                              size="sm"
                              variant="warning"
                              disabled={!editable}
                              aria-label={`Editar recepción ${lote.numero_lote}`}
                              title="Editar recepción"
                              className="py-1 px-2 shadow-sm"
                              onClick={() => onEditar(lote)}
                            >
                              <i className="bi bi-pencil-fill" aria-hidden="true" />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={!editable}
                              aria-label={`Anular recepción ${lote.numero_lote}`}
                              title="Anular recepción"
                              className="py-1 px-2 shadow-sm"
                              onClick={() => onAnular(lote)}
                            >
                              <i className="bi bi-trash-fill" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!listado.datos?.items.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        No hay recepciones para estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
            <Card.Footer className="bg-body border-0">
              <ListPagination
                page={page}
                totalPages={listado.datos?.pages ?? 0}
                total={listado.datos?.total ?? 0}
                changePage={(valor) => filtrar('page', String(valor))}
              />
            </Card.Footer>
          </>
        )}
      </Card>

      <p className="small text-body-secondary mt-3">
        Las recepciones con consumos no se pueden editar ni anular. Los lotes vencidos conservan su
        saldo físico, pero no se asignan a nuevas producciones.
      </p>
    </>
  );
}

export function RecepcionesPage() {
  const { mode, item, open, error, loading } = useCrudRoute<LoteRecepcion>(
    '/recepciones-insumos',
    obtenerLote,
  );
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState('');
  const conciliar = mode === 'crear' && params.get('conciliar') === 'true';
  function back() {
    const query = new URLSearchParams(params);
    query.delete('conciliar');
    navigate(`/recepciones-insumos${query.size ? `?${query}` : ''}`);
  }
  function nuevo(esConciliacion: boolean) {
    setMensaje('');
    const query = new URLSearchParams(params);
    if (esConciliacion) query.set('conciliar', 'true');
    else query.delete('conciliar');
    navigate(`/recepciones-insumos/nuevo${query.size ? `?${query}` : ''}`);
  }
  function abrir(lote: LoteRecepcion, accion?: 'editar' | 'eliminar') {
    setMensaje('');
    open(lote, accion);
  }
  const editable = Boolean(item?.activo && item.cantidad_disponible === item.cantidad);
  return (
    <Container fluid={mode === 'listado'} className="py-2">
      {mode === 'listado' ? (
        <header className="recepciones-encabezado mb-4">
          <div>
            <h2 className="mb-2">Recepción de insumos</h2>
            <p className="text-body-secondary mb-0">
              Consultá el origen, el saldo y el vencimiento de cada lote.
            </p>
          </div>
          <Button variant="success" onClick={() => nuevo(false)}>
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            Nueva recepción
          </Button>
        </header>
      ) : (
        <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Recepciones de Insumos</h2>
      )}
      {mode === 'listado' && mensaje && (
        <Alert variant="success" role="status" dismissible onClose={() => setMensaje('')} className="recepciones-mensaje">
          <i className="bi bi-check-circle me-2" aria-hidden="true" />
          {mensaje}
        </Alert>
      )}
      {loading && <p role="status">Cargando recepción...</p>}
      {error && (
        <Alert variant="danger">
          {error}
          <div className="mt-3">
            <Button variant="secondary" onClick={back}>
              Volver
            </Button>
          </div>
        </Alert>
      )}
      {mode === 'listado' && (
        <RecepcionesListado
          onVer={(l) => abrir(l)}
          onEditar={(l) => abrir(l, 'editar')}
          onAnular={(l) => abrir(l, 'eliminar')}
        />
      )}
      {(mode === 'crear' || (mode === 'editar' && item && editable)) && (
        <RecepcionForm
          key={item?.id ?? String(conciliar)}
          inicial={mode === 'editar' ? item : null}
          conciliar={conciliar}
          onCancelar={back}
          onGuardado={() => {
            setMensaje(
              conciliar
                ? 'El stock anterior quedó identificado sin volver a sumarlo.'
                : 'La recepción se guardó y el stock quedó actualizado.',
            );
            back();
          }}
        />
      )}
      {mode === 'ver' && item && (
        <>
          <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '1100px' }}>
            <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
              <i className="bi bi-box-arrow-in-down me-2" aria-hidden="true" />
              Detalle de la Recepción
            </Card.Header>
            <Card.Body className="p-4">
              <div
                className="d-grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}
              >
                <div className="bg-body-tertiary p-3 rounded border">
                  <h6 className="fw-semibold border-bottom pb-2 mb-3">Datos de la recepción</h6>
                  <dl className="row mb-0 gy-2">
                    <dt className="col-sm-5 text-body-secondary">Lote del proveedor:</dt>
                    <dd className="col-sm-7 mb-0 text-break">{item.numero_lote}</dd>
                    <dt className="col-sm-5 text-body-secondary">Insumo:</dt>
                    <dd className="col-sm-7 mb-0 text-break">{item.insumo_nombre}</dd>
                    <dt className="col-sm-5 text-body-secondary">Proveedor:</dt>
                    <dd className="col-sm-7 mb-0 text-break">
                      <Link to={`/proveedores/${item.proveedor_id}`}>{item.proveedor_nombre}</Link>
                    </dd>
                    <dt className="col-sm-5 text-body-secondary">Fecha de recepción:</dt>
                    <dd className="col-sm-7 mb-0">{formatearFecha(item.fecha_recepcion)}</dd>
                    <dt className="col-sm-5 text-body-secondary">Estado de recepción:</dt>
                    <dd className="col-sm-7 mb-0">
                      <Badge bg={item.activo ? 'success' : 'secondary'}>
                        {item.activo ? 'Activa' : 'Anulada'}
                      </Badge>
                    </dd>
                  </dl>
                </div>
                <div
                  className={`p-3 rounded border border-${!item.activo ? 'secondary' : item.estado_vencimiento === 'vencido' ? 'danger' : item.estado_vencimiento === 'por_vencer' ? 'warning' : 'success'}`}
                >
                  <h6 className="fw-semibold border-bottom pb-2 mb-3">Stock y vencimiento del lote</h6>
                  <dl className="row mb-0 gy-2">
                    <dt className="col-sm-5 text-body-secondary">
                      {item.conciliacion ? 'Cantidad identificada:' : 'Cantidad recibida:'}
                    </dt>
                    <dd className="col-sm-7 mb-0">{item.cantidad} {item.unidad}</dd>
                    <dt className="col-sm-5 text-body-secondary">Saldo del lote:</dt>
                    <dd className="col-sm-7 mb-0">{item.cantidad_disponible} {item.unidad}</dd>
                    <dt className="col-sm-5 text-body-secondary">Fecha de vencimiento:</dt>
                    <dd className="col-sm-7 mb-0">{formatearFecha(item.fecha_vencimiento)}</dd>
                    <dt className="col-sm-5 text-body-secondary">Estado de vencimiento:</dt>
                    <dd className="col-sm-7 mb-0">
                      <EstadoLote estado={item.estado_vencimiento} />
                    </dd>
                  </dl>
                  <p className="small text-body-secondary border-top pt-2 mt-3 mb-0">
                    El saldo indica la cantidad registrada en este lote. Para utilizarlo, la recepción
                    debe estar activa, tener saldo y no estar vencida.
                  </p>
                </div>
              </div>
              {!item.activo && (
                <Alert variant="secondary" className="mt-3 mb-0">
                  <strong>Recepción anulada.</strong> Este registro se conserva como historial y
                  no se utiliza en nuevas producciones.
                </Alert>
              )}
              {item.activo && item.cantidad_disponible === 0 && (
                <Alert variant="info" className="mt-3 mb-0">
                  <strong>Lote sin saldo.</strong> Toda la cantidad fue consumida. Podés consultar
                  las producciones asociadas en la trazabilidad.
                </Alert>
              )}
              {item.advertencias.map((aviso) => {
                const loteVencido = aviso === 'El lote está vencido y no puede utilizarse.';
                const habilitacionVencida = aviso === 'La habilitación del proveedor está vencida.';
                return (
                  <Alert variant={loteVencido ? 'danger' : 'warning'} className="mt-3 mb-0" key={aviso}>
                    {loteVencido ? (
                      <><strong>Lote vencido.</strong> Aunque conserve saldo, no puede consumirse en nuevas producciones.</>
                    ) : habilitacionVencida ? (
                      <><strong>Habilitación del proveedor vencida.</strong> Revisá su documentación desde el detalle del proveedor.</>
                    ) : aviso}
                  </Alert>
                );
              })}
              {!editable && (
                <p className="small text-body-secondary mt-3 mb-0">
                  Esta recepción no se puede editar porque está anulada o ya tiene consumos registrados.
                </p>
              )}
            </Card.Body>
            <Card.Footer className="bg-body border-0 d-flex justify-content-end gap-2 pb-4 px-4">
              <Button variant="secondary" onClick={back}>
                Volver
              </Button>
              <Button variant="warning" disabled={!editable} onClick={() => abrir(item, 'editar')}>
                Editar
              </Button>
            </Card.Footer>
          </Card>
          <Trazabilidad key={item.id} lote={item} />
        </>
      )}
      {item && (mode === 'editar' || mode === 'eliminar') && !editable && (
        <Alert variant="warning">
          Esta recepción está anulada o tiene consumos y no se puede modificar.
          <div className="mt-3">
            <Button variant="secondary" onClick={back}>
              Volver
            </Button>
          </div>
        </Alert>
      )}
      {mode === 'eliminar' && item && editable && (
        <ConfirmacionAbastecimiento
          titulo="Anular Recepción"
          descripcion={
            item.conciliacion
              ? 'Se quitará la identificación del stock anterior, sin descontarlo nuevamente.'
              : 'El saldo de esta recepción se retirará del stock del insumo.'
          }
          confirmar="Confirmar anulación"
          onCancelar={back}
          onConfirmar={async () => {
            await anularLote(item.id);
            setMensaje('La recepción se anuló correctamente.');
            back();
          }}
        >
          <strong>{item.numero_lote}</strong>
          <div>
            {item.insumo_nombre} · {item.proveedor_nombre}
          </div>
          <div>
            {item.cantidad_disponible} {item.unidad}
          </div>
        </ConfirmacionAbastecimiento>
      )}
    </Container>
  );
}

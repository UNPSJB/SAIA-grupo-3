import { useCallback, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { ListPagination } from '../../shared/components/ListPagination';
import { formatearFecha, textoDiasRestantes } from '../../shared/libreria/fechas';
import {
  anularLote,
  cargarOpcionesFiltros,
  listarLotes,
  obtenerTrazabilidad,
} from './abastecimientoApi';
import { EstadoLote } from './EstadoLote';
import { RecepcionForm } from './RecepcionForm';
import type { LoteRecepcion } from './types';
import { useConsulta } from './useConsulta';

function Trazabilidad({ lote }: { lote: LoteRecepcion }) {
  const cargar = useCallback(
    (signal: AbortSignal) => obtenerTrazabilidad(lote.id, signal),
    [lote.id],
  );
  const consulta = useConsulta(cargar);
  return (
    <Card className="mt-4">
      <Card.Body>
        <h4>Uso del lote {lote.numero_lote}</h4>
        <p className="text-body-secondary">
          {lote.insumo_nombre} · {lote.proveedor_nombre}
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

export function RecepcionesPage() {
  const [params, setParams] = useSearchParams();
  const consulta = params.toString();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [formulario, setFormulario] = useState<{
    lote: LoteRecepcion | null;
    conciliar: boolean;
  } | null>(null);
  const [confirmacion, setConfirmacion] = useState<LoteRecepcion | null>(null);
  const [trazabilidad, setTrazabilidad] = useState<LoteRecepcion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const cargar = useCallback(
    (signal: AbortSignal) => listarLotes(Object.fromEntries(new URLSearchParams(consulta)), signal),
    [consulta],
  );
  const listado = useConsulta(cargar);
  const opciones = useConsulta(cargarOpcionesFiltros);

  function filtrar(clave: string, valor: string) {
    setTrazabilidad(null);
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

  function guardado() {
    setMensaje(
      formulario?.conciliar
        ? 'El stock anterior quedó identificado sin volver a sumarlo.'
        : 'La recepción se guardó y el stock quedó actualizado.',
    );
    setFormulario(null);
    setTrazabilidad(null);
    filtrar('page', '1');
    listado.recargar();
  }

  async function confirmarAnulacion() {
    if (!confirmacion) return;
    setOcupado(true);
    setErrorAccion('');
    try {
      await anularLote(confirmacion.id);
      setConfirmacion(null);
      setTrazabilidad(null);
      setMensaje('La recepción se anuló y el stock quedó actualizado.');
      filtrar('page', '1');
      listado.recargar();
    } catch (error) {
      setErrorAccion(error instanceof Error ? error.message : 'No se pudo anular la recepción.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="py-3">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
          <h2>Recepciones de insumos</h2>
          <p className="text-body-secondary mb-0">Origen, cantidades disponibles y vencimientos.</p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-start">
          <Button
            variant="outline-secondary"
            onClick={() => setFormulario({ lote: null, conciliar: true })}
          >
            Identificar stock anterior
          </Button>
          <Button onClick={() => setFormulario({ lote: null, conciliar: false })}>
            Registrar recepción
          </Button>
        </div>
      </div>
      {mensaje && (
        <Alert variant="success" role="status">
          {mensaje}
        </Alert>
      )}
      {(listado.error || errorAccion) && (
        <Alert variant="danger">{errorAccion || listado.error}</Alert>
      )}
      {opciones.error && (
        <Alert variant="warning">
          No se pudieron cargar las opciones: {opciones.error}{' '}
          <Button variant="link" onClick={opciones.recargar}>
            Reintentar
          </Button>
        </Alert>
      )}
      {formulario && (
        <RecepcionForm
          key={formulario.lote?.id ?? String(formulario.conciliar)}
          inicial={formulario.lote}
          conciliar={formulario.conciliar}
          onGuardado={guardado}
          onCancelar={() => setFormulario(null)}
        />
      )}
      {confirmacion && (
        <Alert variant="warning">
          <p>
            ¿Anular la recepción del lote <strong>{confirmacion.numero_lote}</strong>? Si fue un
            ingreso nuevo, su saldo se retirará del stock. Si identificaba stock anterior, se
            quitará esa identificación.
          </p>
          <div className="d-flex gap-2">
            <Button variant="danger" disabled={ocupado} onClick={() => void confirmarAnulacion()}>
              Confirmar anulación
            </Button>
            <Button variant="secondary" disabled={ocupado} onClick={() => setConfirmacion(null)}>
              Cancelar
            </Button>
          </div>
        </Alert>
      )}
      <div className="row g-3 mb-3">
        <Form.Group className="col-12 col-md-4" controlId="filtro-insumo">
          <Form.Label>Insumo</Form.Label>
          <Form.Select
            value={params.get('insumo_id') ?? ''}
            onChange={(e) => filtrar('insumo_id', e.target.value)}
          >
            <option value="">Todos</option>
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
        <Form.Group className="col-12 col-md-4" controlId="filtro-proveedor">
          <Form.Label>Proveedor</Form.Label>
          <Form.Select
            value={params.get('proveedor_id') ?? ''}
            onChange={(e) => filtrar('proveedor_id', e.target.value)}
          >
            <option value="">Todos</option>
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
        <Form.Group className="col-12 col-md-4" controlId="filtro-vencimiento">
          <Form.Label>Estado de vencimiento</Form.Label>
          <Form.Select
            value={params.get('estado') ?? ''}
            onChange={(e) => filtrar('estado', e.target.value)}
          >
            <option value="">Todos</option>
            <option value="vigente">Vigentes</option>
            <option value="por_vencer">Próximos a vencer</option>
            <option value="vencido">Vencidos</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="col-12 col-md-4" controlId="filtro-desde">
          <Form.Label>Recibido desde</Form.Label>
          <Form.Control
            type="date"
            value={params.get('fecha_desde') ?? ''}
            onChange={(e) => filtrar('fecha_desde', e.target.value)}
          />
        </Form.Group>
        <Form.Group className="col-12 col-md-4" controlId="filtro-hasta">
          <Form.Label>Recibido hasta</Form.Label>
          <Form.Control
            type="date"
            value={params.get('fecha_hasta') ?? ''}
            onChange={(e) => filtrar('fecha_hasta', e.target.value)}
          />
        </Form.Group>
        <div className="col-12 col-md-4 d-flex flex-wrap align-items-end gap-3">
          <Form.Check
            id="recepciones-anuladas"
            type="switch"
            label="Incluir anuladas"
            checked={params.get('mostrar_inactivos') === 'true'}
            onChange={(e) => filtrar('mostrar_inactivos', String(e.target.checked))}
          />
          <Button
            variant="outline-secondary"
            onClick={() => {
              setParams({});
              setTrazabilidad(null);
            }}
          >
            Limpiar
          </Button>
          <Button variant="outline-primary" onClick={listado.recargar} disabled={listado.cargando}>
            Actualizar
          </Button>
        </div>
      </div>
      {listado.cargando ? (
        <p role="status">Cargando recepciones...</p>
      ) : (
        <>
          <Table responsive striped hover className="align-middle">
            <thead className="table-theme">
              <tr>
                <th>Insumo / lote</th>
                <th>Proveedor</th>
                <th>Recibido</th>
                <th>Disponible</th>
                <th>Recepción</th>
                <th>Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listado.datos?.items.map((lote) => {
                const editable = lote.activo && lote.cantidad_disponible === lote.cantidad;
                return (
                  <tr key={lote.id}>
                    <td>
                      <strong>{lote.insumo_nombre}</strong>
                      <div>{lote.numero_lote}</div>
                      {lote.conciliacion && (
                        <Badge bg="secondary">Stock anterior identificado</Badge>
                      )}
                      {!lote.activo && <Badge bg="secondary">Anulada</Badge>}
                    </td>
                    <td>{lote.proveedor_nombre}</td>
                    <td>
                      {lote.cantidad} {lote.unidad}
                    </td>
                    <td>
                      {lote.cantidad_disponible} {lote.unidad}
                    </td>
                    <td>{formatearFecha(lote.fecha_recepcion)}</td>
                    <td>
                      <div>{formatearFecha(lote.fecha_vencimiento)}</div>
                      <EstadoLote estado={lote.estado_vencimiento} />
                      <small className="d-block text-body-secondary">
                        {textoDiasRestantes(lote.dias_restantes)}
                      </small>
                      {lote.advertencias.map((aviso) => (
                        <small className="d-block text-danger" key={aviso}>
                          {aviso}
                        </small>
                      ))}
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => setTrazabilidad(lote)}
                        >
                          Ver uso
                        </Button>
                        <Button
                          size="sm"
                          variant="warning"
                          disabled={!editable}
                          onClick={() => setFormulario({ lote, conciliar: lote.conciliacion })}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={!editable}
                          onClick={() => {
                            setConfirmacion(lote);
                            setErrorAccion('');
                          }}
                        >
                          Anular
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
          <ListPagination
            page={page}
            totalPages={listado.datos?.pages ?? 0}
            total={listado.datos?.total ?? 0}
            changePage={(valor) => filtrar('page', String(valor))}
          />
        </>
      )}
      <p className="small text-body-secondary mt-3">
        Las recepciones con consumos no se pueden editar ni anular. Los lotes vencidos conservan su
        saldo físico, pero no se asignan a nuevas producciones.
      </p>
      {trazabilidad && <Trazabilidad key={trazabilidad.id} lote={trazabilidad} />}
    </div>
  );
}

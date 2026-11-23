import { useCallback, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Nav, Table } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatearFecha } from '../../shared/libreria/fechas';
import { EquipoForm } from '../equipos/EquipoForm';
import { EquipoView } from '../equipos/EquipoView';
import { getEquipoById, updateEquipo } from '../equipos/equipoApi';
import { VencimientosCalibracionList } from '../equipos/VencimientosCalibracionList';
import type { Equipo, VencimientoCalibracion } from '../equipos/types';
import { PersonalForm } from '../personal/PersonalForm';
import { getPersonalById, updatePersonal } from '../personal/personalApi';
import { PersonalView } from '../personal/PersonalView';
import { VencimientosList as VencimientosPersonalList } from '../personal/VencimientosList';
import type {
  Personal,
  PersonalUpdateInput,
  Vencimiento,
} from '../personal/types';
import {
  obtenerLote,
  obtenerProveedor,
  obtenerTrazabilidad,
} from '../abastecimiento/abastecimientoApi';
import { EstadoLote } from '../abastecimiento/EstadoLote';
import { ProveedorLotes } from '../abastecimiento/ProveedorLotes';
import type {
  ConsumoRecepcion,
  LoteRecepcion,
  Proveedor,
} from '../abastecimiento/types';
import { useConsulta } from '../abastecimiento/useConsulta';
import { useVencimientos } from './useVencimientos';
import { VencimientosList } from './VencimientosList';
import type {
  OrigenVencimiento,
  VencimientoAbastecimiento,
} from './types';

const ORIGENES: OrigenVencimiento[] = [
  'todos',
  'documentacion',
  'calibracion',
  'lote_insumo',
  'habilitacion_proveedor',
];

type DetalleAbastecimiento =
  | { origen: 'lote_insumo'; item: LoteRecepcion }
  | { origen: 'habilitacion_proveedor'; item: Proveedor };

export function VencimientosPage() {
  const [, setSearchParams] = useSearchParams();
  const [origen, setOrigen] = useState<OrigenVencimiento>('todos');
  const vencimientos = useVencimientos('todos', origen === 'todos');

  const cambiarOrigen = (valor: string | null) => {
    if (!valor || !ORIGENES.includes(valor as OrigenVencimiento)) return;
    const nuevoOrigen = valor as OrigenVencimiento;
    if (nuevoOrigen === origen) return;
    setSearchParams(
      (anteriores) => {
        const nuevos = new URLSearchParams(anteriores);
        [
          'page',
          'buscar',
          'ordenar_por',
          'orden',
          'estado',
          'solo_alertas',
          'mostrar_inactivos',
        ].forEach((parametro) => nuevos.delete(parametro));
        return nuevos;
      },
      { replace: true },
    );
    vencimientos.reiniciarFiltros();
    setOrigen(nuevoOrigen);
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h2 className="mb-1">Vencimientos próximos</h2>
          <p className="text-muted mb-0">
            Vencimientos de documentación del personal, calibraciones, lotes de insumos y habilitaciones de proveedores.
          </p>
        </div>
      </div>

      <Nav
        variant="tabs"
        activeKey={origen}
        onSelect={cambiarOrigen}
        className="mb-3"
      >
        <Nav.Item>
          <Nav.Link eventKey="todos">Todos</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="documentacion">Personal</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="calibracion">Calibración</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="lote_insumo">Lotes de Insumos</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="habilitacion_proveedor">Habilitación de Proveedores</Nav.Link>
        </Nav.Item>
      </Nav>

      {origen === 'todos' && (
        <VencimientosList
          items={vencimientos.items}
          page={vencimientos.page}
          totalPages={vencimientos.totalPages}
          total={vencimientos.total}
          loading={vencimientos.loading}
          error={vencimientos.error}
          changePage={vencimientos.changePage}
          busqueda={vencimientos.busqueda}
          setBusqueda={vencimientos.setBusqueda}
          estado={vencimientos.estado}
          setEstado={vencimientos.setEstado}
          soloAlertas={vencimientos.soloAlertas}
          setSoloAlertas={vencimientos.setSoloAlertas}
          limpiarFiltros={vencimientos.limpiarFiltros}
          ordenarPor={vencimientos.ordenarPor}
          orden={vencimientos.orden}
          cambiarOrden={vencimientos.cambiarOrden}
          onActualizar={vencimientos.refrescar}
        />
      )}
      {origen === 'documentacion' && <PestanaPersonal />}
      {origen === 'calibracion' && <PestanaCalibracion />}
      {origen === 'lote_insumo' && (
        <PestanaAbastecimiento
          origen="lote_insumo"
          titulo="Lotes de insumos"
          columnaElemento="Lote de insumo"
        />
      )}
      {origen === 'habilitacion_proveedor' && (
        <PestanaAbastecimiento
          origen="habilitacion_proveedor"
          titulo="Habilitación de proveedores"
          columnaElemento="Habilitación de proveedor"
        />
      )}
    </Container>
  );
}

function PestanaAbastecimiento({
  origen,
  titulo,
  columnaElemento,
}: {
  origen: 'lote_insumo' | 'habilitacion_proveedor';
  titulo: string;
  columnaElemento?: string;
}) {
  const vencimientos = useVencimientos(origen);
  const [modo, setModo] = useState<'listado' | 'ver'>('listado');
  const [detalle, setDetalle] = useState<DetalleAbastecimiento | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const handleAbrirDetalle = async (
    vencimiento: VencimientoAbastecimiento,
  ) => {
    setModo('ver');
    setDetalle(null);
    setCargandoDetalle(true);
    setErrorDetalle(null);
    try {
      if (vencimiento.origen === 'lote_insumo') {
        const lote: LoteRecepcion = await obtenerLote(vencimiento.detalle_id);
        setDetalle({ origen: 'lote_insumo', item: lote });
      } else {
        const proveedor: Proveedor = await obtenerProveedor(vencimiento.detalle_id);
        setDetalle({ origen: 'habilitacion_proveedor', item: proveedor });
      }
    } catch (err) {
      setErrorDetalle(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el detalle del vencimiento.',
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  const volverAlListado = () => {
    setModo('listado');
    setDetalle(null);
    setErrorDetalle(null);
  };

  return (
    <>
      {modo === 'listado' && (
        <VencimientosList
          titulo={titulo}
          mostrarTipo={false}
          columnaElemento={columnaElemento}
          items={vencimientos.items}
          page={vencimientos.page}
          totalPages={vencimientos.totalPages}
          total={vencimientos.total}
          loading={vencimientos.loading}
          error={vencimientos.error}
          changePage={vencimientos.changePage}
          busqueda={vencimientos.busqueda}
          setBusqueda={vencimientos.setBusqueda}
          estado={vencimientos.estado}
          setEstado={vencimientos.setEstado}
          soloAlertas={vencimientos.soloAlertas}
          setSoloAlertas={vencimientos.setSoloAlertas}
          limpiarFiltros={vencimientos.limpiarFiltros}
          ordenarPor={vencimientos.ordenarPor}
          orden={vencimientos.orden}
          cambiarOrden={vencimientos.cambiarOrden}
          onActualizar={vencimientos.refrescar}
          onAbrirAbastecimiento={handleAbrirDetalle}
        />
      )}
      {modo === 'ver' && (
        <>
          {cargandoDetalle && (
            <LoadingSpinner mensaje="Cargando detalle del vencimiento..." />
          )}
          {errorDetalle && (
            <>
              <ErrorAlert mensaje={errorDetalle} />
              <Button variant="secondary" onClick={volverAlListado}>
                Volver al listado
              </Button>
            </>
          )}
          {detalle && (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h4 className="text-secondary fw-normal mb-0">
                  {detalle.origen === 'lote_insumo'
                    ? 'Detalle del lote de insumo'
                    : 'Detalle de la habilitación del proveedor'}
                </h4>
                <Button variant="secondary" onClick={volverAlListado}>
                  Volver al listado
                </Button>
              </div>
              {detalle.origen === 'lote_insumo' ? (
                <LoteInsumoView lote={detalle.item} />
              ) : (
                <ProveedorView proveedor={detalle.item} />
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

function LoteInsumoView({ lote }: { lote: LoteRecepcion }) {
  const cargarTrazabilidad = useCallback(
    (signal: AbortSignal) => obtenerTrazabilidad(lote.id, signal),
    [lote.id],
  );
  const trazabilidad = useConsulta(cargarTrazabilidad);

  return (
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
              <h6 className="fw-semibold border-bottom pb-2 mb-3">
                Datos de la recepción
              </h6>
              <dl className="row mb-0 gy-2">
                <dt className="col-sm-5 text-body-secondary">Lote del proveedor:</dt>
                <dd className="col-sm-7 mb-0 text-break">{lote.numero_lote}</dd>
                <dt className="col-sm-5 text-body-secondary">Insumo:</dt>
                <dd className="col-sm-7 mb-0 text-break">{lote.insumo_nombre}</dd>
                <dt className="col-sm-5 text-body-secondary">Proveedor:</dt>
                <dd className="col-sm-7 mb-0 text-break">{lote.proveedor_nombre}</dd>
                <dt className="col-sm-5 text-body-secondary">Fecha de recepción:</dt>
                <dd className="col-sm-7 mb-0">{formatearFecha(lote.fecha_recepcion)}</dd>
                <dt className="col-sm-5 text-body-secondary">Estado de recepción:</dt>
                <dd className="col-sm-7 mb-0">
                  <Badge bg={lote.activo ? 'success' : 'secondary'}>
                    {lote.activo ? 'Activa' : 'Anulada'}
                  </Badge>
                </dd>
              </dl>
            </div>
            <div
              className={`p-3 rounded border border-${!lote.activo ? 'secondary' : lote.estado_vencimiento === 'vencido' ? 'danger' : lote.estado_vencimiento === 'por_vencer' ? 'warning' : 'success'}`}
            >
              <h6 className="fw-semibold border-bottom pb-2 mb-3">
                Stock y vencimiento del lote
              </h6>
              <dl className="row mb-0 gy-2">
                <dt className="col-sm-5 text-body-secondary">
                  {lote.conciliacion ? 'Cantidad identificada:' : 'Cantidad recibida:'}
                </dt>
                <dd className="col-sm-7 mb-0">
                  {lote.cantidad} {lote.unidad}
                </dd>
                <dt className="col-sm-5 text-body-secondary">Saldo del lote:</dt>
                <dd className="col-sm-7 mb-0">
                  {lote.cantidad_disponible} {lote.unidad}
                </dd>
                <dt className="col-sm-5 text-body-secondary">Fecha de vencimiento:</dt>
                <dd className="col-sm-7 mb-0">
                  {formatearFecha(lote.fecha_vencimiento)}
                </dd>
                <dt className="col-sm-5 text-body-secondary">Estado de vencimiento:</dt>
                <dd className="col-sm-7 mb-0">
                  <EstadoLote estado={lote.estado_vencimiento} />
                </dd>
              </dl>
            </div>
          </div>
          {!!lote.advertencias.length && (
            <Alert variant="warning" className="mt-3 mb-0">
              <ul className="mb-0">
                {lote.advertencias.map((advertencia) => (
                  <li key={advertencia}>{advertencia}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Card.Body>
      </Card>
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
          {trazabilidad.cargando && (
            <LoadingSpinner mensaje="Cargando trazabilidad..." />
          )}
          {trazabilidad.error && <ErrorAlert mensaje={trazabilidad.error} />}
          {trazabilidad.datos && (
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
                {trazabilidad.datos.map((consumo: ConsumoRecepcion) => (
                  <tr key={consumo.lote_produccion_id}>
                    <td>{consumo.codigo}</td>
                    <td>{consumo.producto}</td>
                    <td>{formatearFecha(consumo.fecha_produccion)}</td>
                    <td>
                      {consumo.cantidad_utilizada} {lote.unidad}
                    </td>
                  </tr>
                ))}
                {!trazabilidad.datos.length && (
                  <tr>
                    <td colSpan={4}>Este lote todavía no tiene consumos registrados.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

function ProveedorView({ proveedor }: { proveedor: Proveedor }) {
  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          <i className="bi bi-truck me-2" aria-hidden="true" />
          Detalle del Proveedor
        </Card.Header>
        <Card.Body className="p-4">
          <div className="bg-body-tertiary p-3 rounded border">
            {[
              ['Nombre', proveedor.nombre],
              ['CUIT', proveedor.cuit],
              ['Teléfono', proveedor.telefono || 'Sin teléfono'],
              ['Email', proveedor.email || 'Sin email'],
            ].map(([label, valor]) => (
              <div className="row mb-2" key={label}>
                <span className="col-4 text-muted fw-semibold">{label}:</span>
                <span className="col-8 text-break">{valor}</span>
              </div>
            ))}
            <div className="row align-items-center">
              <span className="col-4 text-muted fw-semibold">Estado:</span>
              <span className="col-8">
                <Badge bg={proveedor.activo ? 'success' : 'danger'}>
                  {proveedor.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </span>
            </div>
          </div>
          <div
            className={`p-3 rounded border mt-3 border-${proveedor.habilitacion_estado === 'vencido' ? 'danger' : proveedor.habilitacion_estado === 'por_vencer' ? 'warning' : proveedor.habilitacion_estado === 'vigente' ? 'success' : 'secondary'}`}
          >
            <h6 className="fw-semibold border-bottom pb-2 mb-3">
              Habilitación del Proveedor
            </h6>
            <div className="row mb-3">
              <span className="col-sm-5 text-body-secondary fw-semibold">
                Número de habilitación:
              </span>
              <span className="col-sm-7 text-break">
                {proveedor.numero_habilitacion || 'Sin registrar'}
              </span>
            </div>
            <div className="row border-top pt-2 align-items-center">
              <span className="col-sm-5 text-body-secondary fw-semibold">
                Vencimiento:
              </span>
              <span className="col-sm-7">
                {proveedor.vencimiento_habilitacion ? (
                  <>
                    {formatearFecha(proveedor.vencimiento_habilitacion)}
                    {proveedor.habilitacion_estado && (
                      <span className="ms-2">
                        <EstadoLote estado={proveedor.habilitacion_estado} />
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-body-secondary">Sin registrar</span>
                )}
              </span>
            </div>
          </div>
        </Card.Body>
      </Card>
      <ProveedorLotes key={proveedor.id} proveedorId={proveedor.id} />
    </>
  );
}

function PestanaPersonal() {
  const [modo, setModo] = useState<'listado' | 'ver' | 'editar'>('listado');
  const [personalSeleccionado, setPersonalSeleccionado] =
    useState<Personal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerLegajo = async (vencimiento: Vencimiento) => {
    setCargando(true);
    setError(null);
    try {
      const personal = await getPersonalById(vencimiento.personal.id);
      setPersonalSeleccionado(personal);
      setModo('ver');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo abrir el legajo.',
      );
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (datos: PersonalUpdateInput) => {
    if (!personalSeleccionado) return;
    await updatePersonal(personalSeleccionado.id, datos);
    const actualizado = await getPersonalById(personalSeleccionado.id);
    setPersonalSeleccionado(actualizado);
    setModo('ver');
  };

  const volverAlListado = () => {
    setModo('listado');
    setPersonalSeleccionado(null);
    setError(null);
  };

  return (
    <>
      {error && <ErrorAlert mensaje={error} />}
      {cargando && <LoadingSpinner mensaje="Abriendo legajo..." />}
      {modo === 'listado' && (
        <VencimientosPersonalList onVerLegajo={handleVerLegajo} />
      )}
      {modo === 'ver' && personalSeleccionado && (
        <>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="secondary" onClick={volverAlListado}>
              Volver al listado
            </Button>
          </div>
          <PersonalView
            personal={personalSeleccionado}
            onEditar={() => setModo('editar')}
            onVolver={volverAlListado}
          />
        </>
      )}
      {modo === 'editar' && personalSeleccionado && (
        <PersonalForm
          personalInicial={personalSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => setModo('ver')}
        />
      )}
    </>
  );
}

function PestanaCalibracion() {
  const [modo, setModo] = useState<'listado' | 'ver' | 'editar'>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerEquipo = async (vencimiento: VencimientoCalibracion) => {
    setCargando(true);
    setError(null);
    try {
      const equipo = await getEquipoById(vencimiento.equipo.id);
      setEquipoSeleccionado(equipo);
      setModo('ver');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo abrir el equipo.',
      );
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (datos: Equipo) => {
    if (!equipoSeleccionado?.id) return;
    await updateEquipo(equipoSeleccionado.id, datos);
    const actualizado = await getEquipoById(equipoSeleccionado.id);
    setEquipoSeleccionado(actualizado);
    setModo('ver');
  };

  const volverAlListado = () => {
    setModo('listado');
    setEquipoSeleccionado(null);
    setError(null);
  };

  const handleCalibracionesActualizadas = async () => {
    if (!equipoSeleccionado?.id) return;
    try {
      const actualizado = await getEquipoById(equipoSeleccionado.id);
      setEquipoSeleccionado(actualizado);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el detalle del equipo.',
      );
    }
  };

  return (
    <>
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          {modo !== 'listado' && (
            <Button
              variant="secondary"
              onClick={volverAlListado}
              className="mb-3"
            >
              Volver al listado
            </Button>
          )}
        </>
      )}
      {cargando && <LoadingSpinner mensaje="Cargando equipo..." />}
      {modo === 'listado' && (
        <VencimientosCalibracionList onVerEquipo={handleVerEquipo} />
      )}
      {modo === 'ver' && equipoSeleccionado && (
        <>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="secondary" onClick={volverAlListado}>
              Volver al listado
            </Button>
          </div>
          <EquipoView
            equipo={equipoSeleccionado}
            onEditar={() => setModo('editar')}
            onVolver={volverAlListado}
            onCalibracionesActualizadas={handleCalibracionesActualizadas}
          />
        </>
      )}
      {modo === 'editar' && equipoSeleccionado && (
        <EquipoForm
          equipoInicial={equipoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => setModo('ver')}
        />
      )}
    </>
  );
}

import { Link } from 'react-router-dom';
import { Badge, Button, Card, Form, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { formatearFecha, textoDiasRestantes } from '../../shared/libreria/fechas';
import { etiquetaDe } from '../../shared/libreria/etiquetas';
import type {
  EstadoVencimiento,
  VencimientoConsolidado,
} from './types';
import { TIPOS_EQUIPOS } from '../equipos/types';

interface VencimientosListProps {
  items: VencimientoConsolidado[];
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  error: string | null;
  changePage: (page: number) => void;
  busqueda: string;
  setBusqueda: (value: string) => void;
  estado: EstadoVencimiento | '';
  setEstado: (value: EstadoVencimiento | '') => void;
  soloAlertas: boolean;
  setSoloAlertas: (value: boolean) => void;
  limpiarFiltros: () => void;
  ordenarPor: string;
  orden: string;
  cambiarOrden: (column: string) => void;
  onActualizar: () => void;
}

const estadosDisponibles: { value: EstadoVencimiento; label: string }[] = [
  { value: 'vencido', label: 'Vencido' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'vigente', label: 'Vigente' },
];

const estados: Record<
  EstadoVencimiento,
  { etiqueta: string; variante: 'danger' | 'warning' | 'success' }
> = {
  vencido: { etiqueta: 'Vencido', variante: 'danger' },
  por_vencer: { etiqueta: 'Por vencer', variante: 'warning' },
  vigente: { etiqueta: 'Vigente', variante: 'success' },
};

export function VencimientosList({
  items,
  page,
  totalPages,
  total,
  loading,
  error,
  changePage,
  busqueda,
  setBusqueda,
  estado: estadoSeleccionado,
  setEstado,
  soloAlertas,
  setSoloAlertas,
  limpiarFiltros,
  ordenarPor,
  orden,
  cambiarOrden,
  onActualizar,
}: VencimientosListProps) {
  return (
    <>
      <h4 className="text-secondary fw-normal mb-3">
        Documentación, calibraciones, lotes de insumos y habilitaciones
      </h4>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <Form.Control
          type="search"
          placeholder="Buscar personal, equipo, insumo, lote o proveedor..."
          aria-label="Buscar vencimiento"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          style={{
            flex: '1 1 240px',
            width: 'auto',
            minWidth: 0,
          }}
        />
        <Form.Select
          aria-label="Filtrar por estado"
          value={estadoSeleccionado}
          onChange={(event) =>
            setEstado(event.target.value as EstadoVencimiento | '')
          }
          style={{
            flex: '0 1 180px',
            width: 'auto',
            maxWidth: '100%',
          }}
        >
          <option value="">Todos los estados</option>
          {estadosDisponibles.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </Form.Select>
        <Form.Check
          type="switch"
          id="solo-alertas-consolidados"
          label="Solo vencidos y próximos"
          checked={soloAlertas}
          onChange={(event) => setSoloAlertas(event.target.checked)}
          className="mb-0 text-nowrap"
        />
        <Button
          variant="success"
          onClick={limpiarFiltros}
          disabled={!estadoSeleccionado && !busqueda && !soloAlertas}
          className="d-flex align-items-center gap-1"
        >
          <i className="bi bi-x-lg" aria-hidden="true"></i>
          <span>Limpiar</span>
        </Button>
        <Button
          variant="success"
          onClick={onActualizar}
          disabled={loading}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true"></i>
          <span>Actualizar</span>
        </Button>
      </div>
      {error && <ErrorAlert mensaje={error} />}
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading && items.length === 0 ? (
            <LoadingSpinner mensaje="Cargando vencimientos..." />
          ) : (
            <Table
              striped
              hover
              responsive
              className="mb-0 align-middle tabla-vencimientos"
            >
              <thead className="table-theme">
                <tr>
                  <th>Tipo</th>
                  <SortableHeader
                    column="elemento"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Elemento
                  </SortableHeader>
                  <SortableHeader
                    column="fecha_vencimiento"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Vencimiento
                  </SortableHeader>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      {estadoSeleccionado || busqueda || soloAlertas
                        ? 'No hay vencimientos para los filtros actuales.'
                        : 'No hay vencimientos para mostrar.'}
                    </td>
                  </tr>
                ) : (
                  items.map((vencimiento) => {
                    const estado = estados[vencimiento.estado];
                    if ('elemento' in vencimiento) {
                      return (
                        <tr key={`${vencimiento.origen}-${vencimiento.id}`}>
                          <td>{vencimiento.origen === 'lote_insumo' ? 'Lote de insumo' : 'Habilitación de proveedor'}</td>
                          <td><strong>{vencimiento.elemento}</strong><small className="d-block text-body-secondary">{vencimiento.descripcion}</small></td>
                          <td>{formatearFecha(vencimiento.fecha_vencimiento)}<small className="d-block text-body-secondary">{textoDiasRestantes(vencimiento.dias_restantes)}</small></td>
                          <td><Badge bg={estado.variante} text={vencimiento.estado === 'por_vencer' ? 'dark' : undefined}>{estado.etiqueta}</Badge></td>
                          <td className="text-center"><Link to={vencimiento.enlace} className="btn btn-success btn-sm text-white text-nowrap">{vencimiento.origen === 'lote_insumo' ? 'Ver recepciones' : 'Ver proveedores'}</Link></td>
                        </tr>
                      );
                    }
                    const documentacion =
                      vencimiento.origen === 'documentacion';
                    const nombre = documentacion
                      ? `${vencimiento.personal.apellido}, ${vencimiento.personal.nombre}`
                      : vencimiento.equipo.nombre;
                    const equipo =
                      vencimiento.origen === 'calibracion'
                        ? vencimiento.equipo
                        : null;
                    const detalle = documentacion
                      ? `/personal/${vencimiento.detalle_id}`
                      : `/equipos/${vencimiento.detalle_id}`;

                    return (
                      <tr key={`${vencimiento.origen}-${vencimiento.id}`}>
                        <td>
                          {documentacion ? 'Documentación' : 'Calibración'}
                        </td>
                        <td>
                          <strong>{nombre}</strong>
                          <br />
                          {documentacion ? (
                            <>
                              <small className="text-muted">
                                DNI: {vencimiento.personal.dni} · Legajo{' '}
                                <Badge bg="secondary">
                                  #{vencimiento.personal.nroLegajo}
                                </Badge>
                              </small>
                              <br />
                              <small className="text-muted">
                                {vencimiento.tipo_documento.nombre}
                              </small>
                            </>
                          ) : (
                            <>
                              <small className="text-muted">
                                N° de serie:{' '}
                                <span className="font-monospace">
                                  {equipo?.numero_serie}
                                </span>
                                {' · '}
                                <Badge bg="secondary">
                                  {etiquetaDe(TIPOS_EQUIPOS, equipo?.tipo ?? '')}
                                </Badge>
                              </small>
                              <br />
                              <small className="text-muted">
                                Sector: {vencimiento.sector?.nombre ?? 'Sin sector'}
                              </small>
                            </>
                          )}
                        </td>
                        <td>
                          {formatearFecha(vencimiento.fecha_vencimiento)}
                          <br />
                          <small className="text-muted">
                            {textoDiasRestantes(vencimiento.dias_restantes)}
                          </small>
                          {vencimiento.origen === 'calibracion' && (
                            <>
                              <br />
                              <small className="text-muted">
                                Última calibración:{' '}
                                {formatearFecha(vencimiento.fecha_ultima_calibracion)}
                                {' · Cada '}
                                {vencimiento.periodicidad_dias} días
                              </small>
                            </>
                          )}
                        </td>
                        <td>
                          <Badge
                            bg={estado.variante}
                            className={
                              vencimiento.estado === 'por_vencer'
                                ? 'text-dark'
                                : ''
                            }
                          >
                            {estado.etiqueta}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Link
                            to={detalle}
                            className="btn btn-success btn-sm text-white py-1 px-2 shadow-sm text-nowrap"
                            style={{ width: '150px' }}
                            title={
                              documentacion
                                ? 'Ver legajo del empleado'
                                : 'Ver detalle y calibraciones del equipo'
                            }
                          >
                            <i
                              className={`bi ${documentacion ? 'bi-person-vcard' : 'bi-tools'} me-1`}
                              aria-hidden="true"
                            ></i>
                            {documentacion ? 'Ir al legajo' : 'Ir al equipo'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
        {totalPages > 0 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-body border-top">
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              changePage={changePage}
            />
          </Card.Footer>
        )}
      </Card>
    </>
  );
}

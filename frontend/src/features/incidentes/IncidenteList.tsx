import { lazy, Suspense, useRef } from 'react';
import { BotonExportarPdf } from '../../shared/components/BotonExportarPdf';
import { ListPagination } from '../../shared/components/ListPagination';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { formatearFecha, formatearFechaHora, type RangoFechas } from '../../shared/libreria/fechas';
import './incidentes.css';
import { Badge, Button, Card, Form, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { EnlaceArchivo } from '../../shared/components/EnlaceArchivo';
import { useAuth } from '../../shared/hooks/useAuth';
import { useIncidente } from './useIncidente';
import type { EstadoIncidente, Incidente, TipoIncidente } from './types';
import { ESTADOS_INCIDENTE } from './types';
import { textoBadge } from '../../shared/libreria/etiquetas';

const PanelEstadisticasIncidentes = lazy(() =>
  import('./estadisticas/PanelEstadisticasIncidentes').then((modulo) => ({
    default: modulo.PanelEstadisticasIncidentes,
  })),
);

interface IncidenteListProps {
  onNuevoClick: () => void;
  onViewClick: (incidente: Incidente) => void;
  onEditarClick: (incidente: Incidente) => void;
  onEliminarClick: (incidente: Incidente) => void;
  onAccionCorrectivaClick: (incidente: Incidente) => void;
  onReabrirClick: (incidente: Incidente) => void;
}

export function IncidenteList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
  onAccionCorrectivaClick,
  onReabrirClick,
}: IncidenteListProps) {
  const { currentUser } = useAuth();
  const esAdministrador = currentUser?.administrar === true;
  const {
    incidentes,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    estado,
    setEstado,
    tipoId,
    setTipoId,
    tiposActivos,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    limpiarFiltros,
    busqueda,
    setBusqueda,
    ordenarPor,
    orden,
    cambiarOrden,
    filtrarPorTipo,
  } = useIncidente();
  const listadoRef = useRef<HTMLDivElement>(null);

  const seleccionarTipoDesdeGrafico = (tipo: TipoIncidente | null, rango: RangoFechas) => {
    if (tipo === null) {
      setTipoId('');
      return;
    }
    filtrarPorTipo(String(tipo.id), rango.desde, rango.hasta);
    listadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const tipoFiltradoInactivo = tipoId !== '' && !tiposActivos.some((t) => String(t.id) === tipoId);

  const getEstado = (valor: EstadoIncidente) =>
    ESTADOS_INCIDENTE.find((e) => e.value === valor) ?? { label: valor, variante: 'secondary' };

  return (
    <>
      {esAdministrador && (
        <Suspense fallback={<LoadingSpinner mensaje="Cargando estadísticas..." />}>
          <PanelEstadisticasIncidentes
            tipoSeleccionadoId={tipoId ? Number(tipoId) : null}
            onSeleccionarTipo={seleccionarTipoDesdeGrafico}
          />
        </Suspense>
      )}
      <div className="mb-3" ref={listadoRef} style={{ scrollMarginTop: '1rem' }}>
        <h4 className="text-secondary fw-normal mb-3">
          {esAdministrador ? 'Registro de Incidentes' : 'Incidentes que reportaste'}
        </h4>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2" style={{ maxWidth: '100%' }}>
            <Form.Control
              type="search"
              aria-label="Buscar incidente"
              placeholder="Buscar por descripción o DNI"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '220px', maxWidth: '100%' }}
            />
            <Form.Select
              aria-label="Filtrar por estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoIncidente | '')}
              style={{ width: '170px', maxWidth: '100%' }}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_INCIDENTE.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              aria-label="Filtrar por tipo"
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
              style={{ width: '200px', maxWidth: '100%' }}
            >
              <option value="">Todos los tipos</option>
              {tipoFiltradoInactivo && <option value={tipoId}>Tipo dado de baja</option>}
              {tiposActivos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Form.Select>
            <Form.Control
              type="date"
              aria-label="Filtrar desde fecha"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ width: '170px', maxWidth: '100%' }}
            />
            <Form.Control
              type="date"
              aria-label="Filtrar hasta fecha"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ width: '170px', maxWidth: '100%' }}
            />
            <Button
              variant="success"
              onClick={limpiarFiltros}
              disabled={!busqueda && !estado && !tipoId && !fechaDesde && !fechaHasta}
              className="d-flex align-items-center gap-1"
            >
              <i className="bi bi-x-lg"></i>
              <span>Limpiar</span>
            </Button>
          </div>
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 ms-auto">
            <BotonExportarPdf<Incidente>
              modulo="incidentes"
              titulo="Registro de Incidentes"
              endpoint="incidentes"
              parametros={{
                buscar: busqueda,
                ordenar_por: ordenarPor,
                orden,
                estado,
                tipo_id: tipoId,
                fecha_desde: fechaDesde,
                fecha_hasta: fechaHasta,
              }}
              subtitulo={
                [
                  busqueda ? `Búsqueda: "${busqueda}"` : null,
                  estado ? `Estado: ${getEstado(estado).label}` : null,
                  fechaDesde ? `Desde: ${formatearFecha(fechaDesde)}` : null,
                  fechaHasta ? `Hasta: ${formatearFecha(fechaHasta)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              columnas={[
                { titulo: 'Fecha y hora', valor: (i) => formatearFechaHora(i.fecha_hora) },
                { titulo: 'Tipo', valor: (i) => i.tipo.nombre },
                { titulo: 'Descripción', valor: (i) => i.descripcion },
                {
                  titulo: 'Reportado por',
                  valor: (i) =>
                    `${i.reportado_por.apellido}, ${i.reportado_por.nombre} (DNI ${i.reportado_por_dni})`,
                },
                { titulo: 'Estado', valor: (i) => getEstado(i.estado).label },
              ]}
            />
            {currentUser?.operar && (
              <Button
                variant="success"
                onClick={onNuevoClick}
                className="d-flex align-items-center gap-1 shadow-sm"
              >
                <i className="bi bi-plus-lg"></i>
                <span>Nuevo Incidente</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorAlert mensaje={error} />}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading && incidentes.length === 0 ? (
            <LoadingSpinner mensaje="Cargando incidentes..." />
          ) : (
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-theme">
                <tr>
                  <SortableHeader
                    column="fecha_hora"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Fecha y hora
                  </SortableHeader>
                  <th>Tipo</th>
                  <SortableHeader
                    column="descripcion"
                    ordenarPor={ordenarPor}
                    orden={orden}
                    cambiarOrden={cambiarOrden}
                  >
                    Descripción
                  </SortableHeader>
                  {esAdministrador && (
                    <SortableHeader
                      column="reportado_por_dni"
                      ordenarPor={ordenarPor}
                      orden={orden}
                      cambiarOrden={cambiarOrden}
                    >
                      Reportado por
                    </SortableHeader>
                  )}
                  <th>Foto</th>
                  <th>Estado</th>
                  <th className="text-center" style={{ width: esAdministrador ? '200px' : '90px' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {incidentes.length === 0 ? (
                  <tr>
                    <td colSpan={esAdministrador ? 7 : 6} className="text-center py-4 text-muted">
                      {estado || tipoId || fechaDesde || fechaHasta || busqueda
                        ? 'No hay incidentes para los filtros actuales.'
                        : esAdministrador
                          ? 'No hay incidentes registrados.'
                          : 'Todavía no reportaste incidentes.'}
                    </td>
                  </tr>
                ) : (
                  incidentes.map((incidente) => {
                    const infoEstado = getEstado(incidente.estado);
                    return (
                      <tr key={incidente.id}>
                        <td>{formatearFechaHora(incidente.fecha_hora)}</td>
                        <td>
                          <Badge bg={incidente.tipo.color} text={textoBadge(incidente.tipo.color)}>
                            {incidente.tipo.nombre}
                          </Badge>
                        </td>

                        <td className="text-break">{incidente.descripcion}</td>
                        {esAdministrador && (
                          <td>
                            <span>
                              {incidente.reportado_por.apellido}, {incidente.reportado_por.nombre}
                            </span>
                            <div>
                              <small className="text-muted">DNI: {incidente.reportado_por_dni}</small>
                            </div>
                          </td>
                        )}
                        <td>
                          {incidente.imagen_path ? (
                            <EnlaceArchivo
                              ruta={incidente.imagen_path}
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center gap-1 text-nowrap"
                              title="Ver foto"
                              aria-label="Ver foto del incidente (abre en otra pestaña)"
                            >
                              <i className="bi bi-image" aria-hidden="true"></i>
                              <span>Ver foto</span>
                            </EnlaceArchivo>
                          ) : (
                            <Badge bg="secondary">Sin foto</Badge>
                          )}
                        </td>
                        <td>
                          <Badge bg={infoEstado.variante}>{infoEstado.label}</Badge>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Ver Detalle"
                              onClick={() => onViewClick(incidente)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            {currentUser?.administrar && (
                              <>
                                {incidente.estado === 'abierto' ? (
                                  <Button
                                    variant="success"
                                    size="sm"
                                    className="py-1 px-2 shadow-sm"
                                    title="Registrar acción correctiva y cerrar"
                                    onClick={() => onAccionCorrectivaClick(incidente)}
                                  >
                                    <i className="bi bi-clipboard-check-fill"></i>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="py-1 px-2 shadow-sm"
                                    title="Reabrir incidente"
                                    onClick={() => onReabrirClick(incidente)}
                                  >
                                    <i className="bi bi-arrow-counterclockwise"></i>
                                  </Button>
                                )}
                                <Button
                                  variant="warning"
                                  size="sm"
                                  className="text-white py-1 px-2 shadow-sm"
                                  title="Modificar"
                                  onClick={() => onEditarClick(incidente)}
                                >
                                  <i className="bi bi-pencil-fill"></i>
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="py-1 px-2 shadow-sm"
                                  title="Eliminar"
                                  onClick={() => onEliminarClick(incidente)}
                                >
                                  <i className="bi bi-trash3-fill"></i>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {totalPages > 0 && !loading && (
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
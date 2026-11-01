import { Card, Button, Badge, Table, Spinner, Form } from 'react-bootstrap'
import { COLORES_EQUIPO, TIPOS_EQUIPOS } from './types';
import type { Equipo } from './types';
import { CalibracionesEquipo } from './CalibracionesEquipo';
import { formatearFecha } from '../../shared/libreria/fechas';
import { etiquetaDe, textoBadge } from '../../shared/libreria/etiquetas';
import { useState, useEffect } from 'react';
import { getRegistrosTemperatura, type RegistroTemperatura } from '../registroTemperatura/registroTemperaturaApi';
import { GraficoTemperatura } from './GraficoTemperatura'; 

interface EquipoViewProps {
  equipo: Equipo;
  onEditar: () => void;
  onVolver: () => void;
  onCalibracionesActualizadas?: () => void;
}

export function EquipoView({
  equipo,
  onEditar,
  onVolver,
  onCalibracionesActualizadas,
}: EquipoViewProps) {
  const etiquetaTipo = etiquetaDe(TIPOS_EQUIPOS, equipo.tipo);

  let fechaVencimiento: Date | null = null;
  let estaVencido = false;

  if (equipo.fecha_ultima_calibracion && equipo.periodicidad_dias) {
    const lastCal = new Date(`${equipo.fecha_ultima_calibracion}T00:00:00`);
    fechaVencimiento = new Date(lastCal);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + equipo.periodicidad_dias);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    estaVencido = fechaVencimiento < hoy;
  }

  const [registrosTemp, setRegistrosTemp] = useState<RegistroTemperatura[]>([]);
  const [cargandoTemp, setCargandoTemp] = useState(false);
  
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  useEffect(() => {
    if (equipo?.id && equipo.controla_temperatura) {
      setCargandoTemp(true);
      getRegistrosTemperatura(
        equipo.id, 
        fechaDesde ? fechaDesde : undefined, 
        fechaHasta ? fechaHasta : undefined, 
        soloAlertas, 1, 50 
      )
        .then((data) => setRegistrosTemp(data.items))
        .catch((err) => console.error('Error al cargar historial de temperatura:', err))
        .finally(() => setCargandoTemp(false));
    }
  }, [equipo, fechaDesde, fechaHasta, soloAlertas]); 

 return (
    <div className="mx-auto" style={{ maxWidth: '850px' }}>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
        <Card.Header className="bg-body-tertiary text-secondary d-flex align-items-center gap-2 py-3">
          <i className="bi bi-tools fs-5 flex-shrink-0"></i>
          <h5 className="mb-0">Detalle del Equipo</h5>
        </Card.Header>
        
        <Card.Body className="p-4">
          <div className="bg-body-tertiary p-3 rounded border mb-3">
            <div className="row mb-2">
              <span className="col-4 text-muted fw-semibold">N° de Serie:</span>
              <span className="col-8 fw-bold font-monospace">{equipo.numero_serie}</span>
            </div>
            <div className="row mb-2">
              <span className="col-4 text-muted fw-semibold">Nombre:</span>
              <span className="col-8">{equipo.nombre}</span>
            </div>
            <div className="row mb-2">
              <span className="col-4 text-muted fw-semibold">Tipo:</span>
              <span className="col-8">
                <Badge bg={COLORES_EQUIPO[equipo.tipo]} text={textoBadge(COLORES_EQUIPO[equipo.tipo])}>
                  {etiquetaTipo}
                </Badge>
              </span>
            </div>
            <div className="row mb-2">
              <span className="col-4 text-muted fw-semibold">Sector Asignado:</span>
              <span className="col-8">
                {equipo.sector ? (
                  <span className="fw-medium text-body">{equipo.sector.nombre}</span>
                ) : (
                  <span className="text-muted">Sector #{equipo.sector_id}</span>
                )}
              </span>
            </div>
            {equipo.controla_temperatura && (
              <div className="row border-top pt-2 mt-2">
                <span className="col-4 text-muted fw-semibold">Rango de Frío:</span>
                <span className="col-8">
                  <Badge bg="info" className="text-dark">
                    {equipo.temperatura_minima}°C a {equipo.temperatura_maxima}°C
                  </Badge>
                </span>
              </div>
            )}
          </div>

          <div className={`bg-body p-3 rounded border ${estaVencido ? 'border-danger-subtle' : 'border-secondary-subtle'}`}>
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h6 className="text-secondary fw-bold mb-0">
                Calibración y Mantenimiento
              </h6>
            </div>

            <div className="row mb-2">
              <span className="col-5 text-muted fw-semibold">Última Calibración:</span>
              <span className="col-7">{formatearFecha(equipo.fecha_ultima_calibracion, 'No registrada')}</span>
            </div>
            <div className="row mb-2">
              <span className="col-5 text-muted fw-semibold">Periodicidad:</span>
              <span className="col-7">
                {equipo.periodicidad_dias ? `${equipo.periodicidad_dias} días` : 'No definida'}
              </span>
            </div>
            <div className="row mt-3 pt-2 border-top">
              <span className="col-5 text-muted fw-semibold">Próximo Vencimiento:</span>
              <span className="col-7">
                {fechaVencimiento ? (
                  <Badge bg={estaVencido ? 'danger' : 'success'} className="fs-6 fw-medium">
                    {formatearFecha(fechaVencimiento.toISOString())}
                    {estaVencido && ' (Vencido)'}
                  </Badge>
                ) : (
                  <span className="text-muted fst-italic">Faltan datos para calcular</span>
                )}
              </span>
            </div>
          </div>
        </Card.Body>

        <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
          <Button variant="secondary" onClick={onVolver}>
            Volver
          </Button>
          <Button variant="warning" onClick={onEditar} className="text-dark fw-medium">
            Editar Datos
          </Button>
        </Card.Footer>
      </Card>
      
      {equipo.id !== undefined && (
        <CalibracionesEquipo
          equipoId={equipo.id}
          periodicidadDias={equipo.periodicidad_dias}
          onCambio={onCalibracionesActualizadas}
        />
      )}
      {equipo.controla_temperatura && (
        <Card className="shadow-sm border-0 mt-5 mx-auto bg-body" style={{ maxWidth: '850px' }}>
          <Card.Header className="bg-transparent border-0 pt-4 pb-2 px-4">
            <h5 className="fw-bold mb-0">Historial de Control de Temperatura</h5>
          </Card.Header>
          <Card.Body className="p-4">
            <div className="bg-body-tertiary p-3 rounded border mb-4 d-flex flex-wrap gap-4 align-items-end">
              <Form.Group>
                <Form.Label className="text-body-secondary small mb-1 fw-semibold">Fecha Desde</Form.Label>
                <Form.Control 
                  type="date" 
                  size="sm" 
                  value={fechaDesde} 
                  onChange={(e) => setFechaDesde(e.target.value)} 
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="text-body-secondary small mb-1 fw-semibold">Fecha Hasta</Form.Label>
                <Form.Control 
                  type="date" 
                  size="sm" 
                  value={fechaHasta} 
                  onChange={(e) => setFechaHasta(e.target.value)} 
                />
              </Form.Group>
              <Form.Group className="mb-1 ms-auto">
                <Form.Check 
                  type="switch"
                  id="switch-alertas"
                  label={<span className="fw-semibold text-danger">Solo Fuera de Rango</span>}
                  checked={soloAlertas}
                  onChange={(e) => setSoloAlertas(e.target.checked)}
                />
              </Form.Group>
            </div>
            {cargandoTemp ? (
              <div className="text-center p-4">
                <Spinner animation="border" size="sm" variant="primary" /> Cargando registros...
              </div>
            ) : registrosTemp.length === 0 ? (
              <p className="text-center text-muted p-4 mb-0">
                Aún no hay registros de temperatura para este equipo.
              </p>
            ) : (
              <>
                <div className="mb-4 pb-2 border-bottom">
                  <GraficoTemperatura 
                    registros={registrosTemp} 
                    temperaturaMinima={equipo.temperatura_minima as number} 
                    temperaturaMaxima={equipo.temperatura_maxima as number} 
                  />
                </div>

              <Table responsive hover className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th className="ps-3 border-bottom-0 text-body-secondary fs-6 fw-semibold">Fecha y Hora</th>
                      <th className="border-bottom-0 text-body-secondary fs-6 fw-semibold">Operario</th>
                      <th className="border-bottom-0 text-body-secondary fs-6 fw-semibold">Lectura</th>
                      <th className="border-bottom-0 text-body-secondary fs-6 fw-semibold">Estado</th>
                      <th className="pe-3 border-bottom-0 text-body-secondary fs-6 fw-semibold">Acción Tomada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosTemp.map((reg) => (
                      <tr key={reg.id}>
                        <td className="ps-3 fs-6">
                          {new Date(reg.fecha_hora_registro).toLocaleString()}
                        </td>
                        <td className="fs-6">
                          {reg.operario.nombre} {reg.operario.apellido}
                        </td>
                        <td>
                          <span className={`fw-bold fs-6 ${reg.fuera_de_rango ? 'text-danger' : 'text-success'}`}>
                            {reg.temperatura_registrada}°C
                          </span>
                        </td>
                        <td>
                          {reg.fuera_de_rango ? (
                            <Badge bg="danger" className="fs-6">Fuera de rango</Badge>
                          ) : (
                            <Badge bg="success" className="fs-6">Normal</Badge>
                          )}
                        </td>
                        <td className="fs-6 text-muted pe-3">
                          {reg.accion_tomada || <span className="fst-italic">Ninguna (En rango)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
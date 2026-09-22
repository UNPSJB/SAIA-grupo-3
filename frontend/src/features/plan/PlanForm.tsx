import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import type { PlanCreate, FrecuenciaPlan } from './types';
import { FRECUENCIAS } from './types';
import { getPersonal, type Personal } from '../personal';
import { getSectores, type Sector } from '../sectores';
import { getEquipos, type Equipo } from '../equipos';
import type { Tarea } from '../tarea/types';
import { getTareas } from '../tarea/tareaApi';


interface PlanFormProps {
  onGuardar: (datos: PlanCreate) => Promise<void>;
  onCancelar: () => void;
}

export function PlanForm({ onGuardar, onCancelar }: PlanFormProps) {
  const [nombre, setNombre] = useState('');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPlan>('diario');
  const [responsableId, setResponsableId] = useState<number | ''>('');
  const [sectorId, setSectorId] = useState<number | ''>('');
  const [equipoId, setEquipoId] = useState<number | ''>('');
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<number[]>([]);
  
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  
  const [cargandoDependencias, setCargandoDependencias] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPersonal(1, 100),
      getSectores(1, 100),
      getEquipos(1, 100),
      getTareas(1, 100)
    ]).then(([resPersonal, resSectores, resEquipos, resTareas]) => {
      setPersonal(resPersonal.items);
      setSectores(resSectores.items);
      setEquipos(resEquipos.items);
      setTareas(resTareas.items);
    }).catch(() => {
      setErrorValidacion('Error al cargar los datos necesarios para el formulario.');
    }).finally(() => {
      setCargandoDependencias(false);
    });
  }, []);

  const handleTareaToggle = (id: number) => {
    setTareasSeleccionadas(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!sectorId && !equipoId) {
      setErrorValidacion('Debe asignar el plan a un Sector o a un Equipo.');
      return;
    }
    if (tareasSeleccionadas.length === 0) {
      setErrorValidacion('Debe seleccionar al menos una tarea.');
      return;
    }

    setEnviando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        frecuencia,
        responsable_id: Number(responsableId),
        sector_id: sectorId ? Number(sectorId) : null,
        equipo_id: equipoId ? Number(equipoId) : null,
        tarea_ids: tareasSeleccionadas
      });
    } catch (err: unknown) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al guardar.');
      setEnviando(false);
    }
  };

  const equiposFiltrados = sectorId 
    ? equipos.filter(e => e.sector_id === Number(sectorId)) 
    : equipos;

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        Crear Plan de Limpieza
      </Card.Header>
      <Card.Body className="p-4">
        {errorValidacion && <Alert variant="danger">{errorValidacion}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <div className="row">
            <Form.Group className="col-md-8 mb-3">
              <Form.Label>Nombre del Plan</Form.Label>
              <Form.Control type="text" required placeholder="Ej. Limpieza General Matutina" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Form.Group>
            
            <Form.Group className="col-md-4 mb-3">
              <Form.Label>Frecuencia</Form.Label>
              <Form.Select required value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as FrecuenciaPlan)}>
                {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Form.Select>
            </Form.Group>
          </div>

          <Form.Group className="mb-4">
            <Form.Label>Responsable Asignado</Form.Label>
            <Form.Select required disabled={cargandoDependencias} value={responsableId} onChange={(e) => setResponsableId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Seleccione un empleado...</option>
              {personal.map(p => <option key={p.dni} value={p.dni}>{p.apellido}, {p.nombre} (DNI: {p.dni})</option>)}
            </Form.Select>
          </Form.Group>

          <div className="p-3 bg-light rounded border mb-4">
            <h6 className="mb-3 text-secondary">Ubicación / Destino</h6>
            <div className="row">
              <Form.Group className="col-md-6 mb-3 mb-md-0">
                <Form.Label>Sector (Opcional si elige equipo)</Form.Label>
                <Form.Select disabled={cargandoDependencias} value={sectorId} onChange={(e) => setSectorId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">Todos los sectores...</option>
                  {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="col-md-6">
                <Form.Label>Equipo (Opcional si elige sector)</Form.Label>
                <Form.Select disabled={cargandoDependencias} value={equipoId} onChange={(e) => setEquipoId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">Aplica a todo el sector...</option>
                  {equiposFiltrados.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.numero_serie})</option>)}
                </Form.Select>
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-4">
            <Form.Label>Checklist de Tareas</Form.Label>
            <div className="border rounded p-3 bg-white" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {cargandoDependencias ? <span className="text-muted">Cargando tareas...</span> : 
                tareas.map(t => (
                  <Form.Check 
                    key={t.id}
                    type="checkbox"
                    id={`tarea-${t.id}`}
                    label={t.descripcion}
                    checked={t.id !== undefined && tareasSeleccionadas.includes(t.id)}
                    onChange={() => t.id !== undefined && handleTareaToggle(t.id)}
                    className="mb-2"
                  />
                ))
              }
            </div>
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : 'Guardar Plan'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
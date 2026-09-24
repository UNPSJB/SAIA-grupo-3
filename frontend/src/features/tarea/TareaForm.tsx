import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import type { Tarea, TareaCreate, FrecuenciaTarea } from './types';
import { FRECUENCIAS_TAREA } from './types';
import { getEquipos, type Equipo } from '../equipos';
import { getElementos, type Elemento } from '../elementos';
import type { Insumo } from '../insumos/types';
import { getInsumos} from '../insumos/InsumoApi';

interface TareaFormProps {
  tareaInicial?: Tarea | null;
  onGuardar: (datos: TareaCreate) => Promise<void>;
  onCancelar: () => void;
}

export function TareaForm({ tareaInicial, onGuardar, onCancelar }: TareaFormProps) {
  const [nombre, setNombre] = useState('');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaTarea>('diaria');
  const [equipoId, setEquipoId] = useState<number | ''>('');
  const [procedimiento, setProcedimiento] = useState('');
  const [elementosSeleccionados, setElementosSeleccionados] = useState<number[]>([]);
  const [insumosSeleccionados, setInsumosSeleccionados] = useState<number[]>([]);
  
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargandoDependencias, setCargandoDependencias] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getEquipos(1, 100),
      getElementos(1, 100),
      getInsumos()
    ]).then(([resEquipos, resElementos, resInsumos]) => {
      setEquipos(resEquipos.items);
      setElementos(resElementos.items);
      setInsumos(resInsumos);
    }).catch(() => {
      setErrorValidacion('Error al cargar las dependencias (Equipos, Elementos, Insumos).');
    }).finally(() => {
      setCargandoDependencias(false);
    });
  }, []);

  useEffect(() => {
    if (tareaInicial) {
      setNombre(tareaInicial.nombre);
      setFrecuencia(tareaInicial.frecuencia);
      setEquipoId(tareaInicial.equipo_id || '');
      setProcedimiento(tareaInicial.procedimiento);
      if (tareaInicial.elementos) setElementosSeleccionados(tareaInicial.elementos.map(e => e.id as number));
      if (tareaInicial.insumos) setInsumosSeleccionados(tareaInicial.insumos.map(i => i.id));
    }
  }, [tareaInicial]);

  const handleElementoToggle = (id: number) => {
    setElementosSeleccionados(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const handleInsumoToggle = (id: number) => {
    setInsumosSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);
    if (!nombre.trim() || !procedimiento.trim()) return;

    setEnviando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        frecuencia,
        procedimiento: procedimiento.trim(),
        equipo_id: equipoId ? Number(equipoId) : null,
        elemento_ids: elementosSeleccionados,
        insumo_ids: insumosSeleccionados
      });
    } catch (err: unknown) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al guardar los datos.');
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(tareaInicial);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Tarea #${tareaInicial?.id}` : 'Registrar Nueva Tarea'}
      </Card.Header>
      <Card.Body className="p-4">
        {errorValidacion && <Alert variant="danger">{errorValidacion}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <div className="row">
            <Form.Group className="col-md-8 mb-3">
              <Form.Label>Nombre de la Tarea</Form.Label>
              <Form.Control
                type="text"
                required
                maxLength={150}
                placeholder="Ej: Limpieza profunda de cintas"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>
            
            <Form.Group className="col-md-4 mb-3">
              <Form.Label>Frecuencia</Form.Label>
              <Form.Select required value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as FrecuenciaTarea)}>
                {FRECUENCIAS_TAREA.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Form.Select>
            </Form.Group>
          </div>

          <Form.Group className="mb-4">
            <Form.Label>Equipo Asignado (Opcional)</Form.Label>
            <Form.Select disabled={cargandoDependencias} value={equipoId} onChange={(e) => setEquipoId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Ninguno / No aplica...</option>
              {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.numero_serie})</option>)}
            </Form.Select>
          </Form.Group>

          <div className="row mb-4">
            <div className="col-md-6">
              <Form.Label>Elementos de Limpieza</Form.Label>
              <div className="border rounded p-3 bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {cargandoDependencias ? <span className="text-muted">Cargando...</span> : 
                  elementos.map(el => (
                    <Form.Check 
                      key={`el-${el.id}`}
                      type="checkbox"
                      id={`elemento-${el.id}`}
                      label={el.nombre}
                      checked={el.id !== undefined && elementosSeleccionados.includes(el.id)}
                      onChange={() => el.id !== undefined && handleElementoToggle(el.id)}
                      className="mb-1"
                    />
                  ))
                }
              </div>
            </div>
            
            <div className="col-md-6 mt-3 mt-md-0">
              <Form.Label>Insumos Utilizados</Form.Label>
              <div className="border rounded p-3 bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {cargandoDependencias ? <span className="text-muted">Cargando...</span> : 
                  insumos.map(ins => (
                    <Form.Check 
                      key={`ins-${ins.id}`}
                      type="checkbox"
                      id={`insumo-${ins.id}`}
                      label={`${ins.nombre} (${ins.unidadMedidaObj?.sufijo || ''})`}
                      checked={insumosSeleccionados.includes(ins.id)}
                      onChange={() => handleInsumoToggle(ins.id)}
                      className="mb-1"
                    />
                  ))
                }
              </div>
            </div>
          </div>

          <Form.Group className="mb-4">
            <Form.Label>Procedimiento</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              required
              maxLength={2000}
              placeholder="Describa el paso a paso a realizar..."
              value={procedimiento}
              onChange={(e) => setProcedimiento(e.target.value)}
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Guardar Tarea'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Equipo, TipoEquipo } from './types';
import { TIPOS_EQUIPOS } from './types';
import { getSectores, type Sector } from '../sectores';

interface EquipoFormProps {
  equipoInicial?: Equipo | null;
  onGuardar: (datos: Equipo) => Promise<void>;
  onCancelar: () => void;
}

export function EquipoForm({ equipoInicial, onGuardar, onCancelar }: EquipoFormProps) {
  const [numeroSerie, setNumeroSerie] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoEquipo>('equipo');
  const [sectorId, setSectorId] = useState<number | ''>('');
  
  // --- CAMPOS SPRINT 2 (Reducidos) ---
  const [fechaCalibracion, setFechaCalibracion] = useState('');
  const [periodicidad, setPeriodicidad] = useState<number | ''>('');
  
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [cargandoSectores, setCargandoSectores] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    getSectores(1, 100)
      .then((data) => setSectores(data.items))
      .catch((err: Error) => alert(err.message))
      .finally(() => setCargandoSectores(false));
  }, []);

  useEffect(() => {
    if (equipoInicial) {
      setNumeroSerie(equipoInicial.numero_serie);
      setNombre(equipoInicial.nombre);
      setTipo(equipoInicial.tipo as TipoEquipo);
      setSectorId(equipoInicial.sector_id);
      
      setFechaCalibracion(equipoInicial.fecha_ultima_calibracion || '');
      setPeriodicidad(equipoInicial.periodicidad_dias || '');
    }
  }, [equipoInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroSerie.trim() || !nombre.trim() || sectorId === '') return;

    setEnviando(true);
    try {
      await onGuardar({
        numero_serie: numeroSerie.trim(),
        nombre: nombre.trim(),
        tipo,
        sector_id: Number(sectorId),
        
        fecha_ultima_calibracion: fechaCalibracion || null,
        periodicidad_dias: periodicidad === '' ? null : Number(periodicidad)
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(equipoInicial);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '750px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion
          ? `Modificar Equipo: ${equipoInicial?.numero_serie}`
          : 'Registrar Nuevo Equipo'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          
          <h6 className="text-secondary fw-bold mb-3 border-bottom pb-2">Datos Principales</h6>
          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>N° de Serie / Código Único</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. SN-AB-1234"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Nombre del Equipo</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. Balanza de precisión"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>
          </div>

          <div className="row mb-4">
            <Form.Group className="col-md-6">
              <Form.Label>Tipo de Equipo</Form.Label>
              <Form.Select
                required
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoEquipo)}
              >
                {TIPOS_EQUIPOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="col-md-6">
              <Form.Label>Sector de Ubicación</Form.Label>
              <Form.Select
                required
                disabled={cargandoSectores}
                value={sectorId}
                onChange={(e) =>
                  setSectorId(e.target.value === '' ? '' : Number(e.target.value))
                }
              >
                <option value="">
                  {cargandoSectores
                    ? 'Cargando sectores...'
                    : 'Seleccione un sector...'}
                </option>
                {sectores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
          
          <h6 className="text-secondary fw-bold mt-4 mb-3 border-bottom pb-2">Calibración y Mantenimiento
          </h6>
          <div className="row mb-4 bg-light rounded p-2 pt-3 mx-0 border">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label className="text-secondary small fw-medium">Última Calibración</Form.Label>
              <Form.Control
                type="date"
                value={fechaCalibracion}
                onChange={(e) => setFechaCalibracion(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label className="text-secondary small fw-medium">Periodicidad (Días)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                placeholder="Ej. 30"
                value={periodicidad}
                onChange={(e) => setPeriodicidad(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </Form.Group>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando
                ? 'Guardando...'
                : esEdicion
                ? 'Actualizar Cambios'
                : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
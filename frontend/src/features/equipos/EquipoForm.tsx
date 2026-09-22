import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Equipo, TipoEquipo } from './types';
import { TIPOS_EQUIPOS } from './types';

// IMPORTANTE: Ahora importamos desde el index.ts de la feature 'sectores'
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
      setTipo(equipoInicial.tipo);
      setSectorId(equipoInicial.sector_id);
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
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(equipoInicial);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion
          ? `Modificar Equipo: ${equipoInicial?.numero_serie}`
          : 'Registrar Nuevo Equipo'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
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

          <div className="row">
            <Form.Group className="col-md-6 mb-4">
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

            <Form.Group className="col-md-6 mb-4">
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

          <div className="d-flex justify-content-end gap-2">
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
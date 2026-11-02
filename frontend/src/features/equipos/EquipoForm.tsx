import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { loadAllPages } from '../../shared/libreria/options';
import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
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

// Interfaz para definir la estructura de los datos del formulario
interface ValoresEquipo {
  numeroSerie: string;
  nombre: string;
  tipo: TipoEquipo;
  sectorId: number | '';
  controla_temperatura: boolean;
  temperatura_minima: number | '';
  temperatura_maxima: number | '';
}

export function EquipoForm({ equipoInicial, onGuardar, onCancelar }: EquipoFormProps) {
  const esEdicion = Boolean(equipoInicial);

  const form = useForm<ValoresEquipo>({
    defaultValues: {
      numeroSerie: equipoInicial?.numero_serie ?? '',
      nombre: equipoInicial?.nombre ?? '',
      tipo: equipoInicial?.tipo ?? 'equipo',
      sectorId: equipoInicial?.sector_id ?? '',
      controla_temperatura: equipoInicial?.controla_temperatura ?? false,
      temperatura_minima: equipoInicial?.temperatura_minima ?? '',
      temperatura_maxima: equipoInicial?.temperatura_maxima ?? '',
    },
  });

  const enviando = form.formState.isSubmitting;
  const controlaTemperatura = form.watch('controla_temperatura');

  const {
    field: { value: numeroSerie, onChange: setNumeroSerie, onBlur: numeroSerieBlur, ref: numeroSerieRef, name: numeroSerieName },
  } = useController({
    name: 'numeroSerie',
    control: form.control,
    rules: {
      validate: (value) => (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) || 'Este campo es obligatorio.',
    },
  });

  const {
    field: { value: nombre, onChange: setNombre, onBlur: nombreBlur, ref: nombreRef, name: nombreName },
  } = useController({
    name: 'nombre',
    control: form.control,
    rules: {
      validate: (value) => (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) || 'Este campo es obligatorio.',
    },
  });

  const {
    field: { value: tipo, onChange: setTipo, onBlur: tipoBlur, ref: tipoRef, name: tipoName },
  } = useController({
    name: 'tipo',
    control: form.control,
    rules: {
      validate: (value) => (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) || 'Este campo es obligatorio.',
    },
  });

  const {
    field: { value: sectorId, onChange: setSectorId, onBlur: sectorIdBlur, ref: sectorIdRef, name: sectorIdName },
  } = useController({
    name: 'sectorId',
    control: form.control,
    rules: {
      validate: (value) => (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) || 'Este campo es obligatorio.',
    },
  });

  const [fechaCalibracion, setFechaCalibracion] = useState(() => equipoInicial?.fecha_ultima_calibracion ?? '');
  const [periodicidad, setPeriodicidad] = useState<number | ''>(() => equipoInicial?.periodicidad_dias ?? '');
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [cargandoSectores, setCargandoSectores] = useState(true);

  useEffect(() => {
    loadAllPages((page) => getSectores(page, 100))
      .then((data) => setSectores(data.items))
      .catch((err: Error) => alert(err.message))
      .finally(() => setCargandoSectores(false));
  }, []);

  const handleSubmit = form.handleSubmit(async (valores) => {
    form.clearErrors('root');
    if (!numeroSerie.trim() || !nombre.trim() || sectorId === '') return;

    try {
      await onGuardar({
        ...equipoInicial,
        numero_serie: valores.numeroSerie.trim(),
        nombre: valores.nombre.trim(),
        tipo: valores.tipo,
        sector_id: Number(valores.sectorId),
        fecha_ultima_calibracion: fechaCalibracion || null,
        periodicidad_dias: periodicidad === '' ? null : Number(periodicidad),
        controla_temperatura: valores.controla_temperatura,
        temperatura_minima: valores.controla_temperatura ? Number(valores.temperatura_minima) : null,
        temperatura_maxima: valores.controla_temperatura ? Number(valores.temperatura_maxima) : null,
      } as Equipo);
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al guardar los datos.',
      });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '750px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {esEdicion ? `Modificar Equipo: ${equipoInicial?.numero_serie}` : 'Registrar Nuevo Equipo'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={handleSubmit}>
          <FormErrors key={form.formState.submitCount} errors={form.formState.errors} />

          <div className="row">
            <Form.Group controlId="EquipoForm-numeroSerie" className="col-md-6 mb-3">
              <Form.Label>N° de Serie / Código Único</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. SN-AB-1234"
                ref={numeroSerieRef}
                onBlur={numeroSerieBlur}
                name={numeroSerieName}
                value={numeroSerie}
                isInvalid={!!form.formState.errors.numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="EquipoForm-nombre" className="col-md-6 mb-3">
              <Form.Label>Nombre del Equipo</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. Balanza de precisión"
                ref={nombreRef}
                onBlur={nombreBlur}
                name={nombreName}
                value={nombre}
                isInvalid={!!form.formState.errors.nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group controlId="EquipoForm-tipo" className="col-md-6 mb-4">
              <Form.Label>Tipo de Equipo</Form.Label>
              <SearchableSelect
                required
                ref={tipoRef}
                onBlur={tipoBlur}
                name={tipoName}
                value={tipo}
                isInvalid={!!form.formState.errors.tipo}
                onChange={(e) => setTipo(e.target.value as TipoEquipo)}
              >
                {TIPOS_EQUIPOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SearchableSelect>
            </Form.Group>

            <Form.Group controlId="EquipoForm-sectorId" className="col-md-6 mb-4">
              <Form.Label>Sector de Ubicación</Form.Label>
              <SearchableSelect
                required
                disabled={cargandoSectores}
                ref={sectorIdRef}
                onBlur={sectorIdBlur}
                name={sectorIdName}
                value={sectorId}
                isInvalid={!!form.formState.errors.sectorId}
                onChange={(e) => setSectorId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">
                  {cargandoSectores ? 'Cargando sectores...' : 'Seleccione un sector...'}
                </option>
                {sectores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </SearchableSelect>
            </Form.Group>
          </div>

          <Form.Group className="mb-4 bg-body-tertiary p-3 rounded border">
            <Form.Check
              type="switch"
              id="controla_temperatura"
              label={<span className="fw-semibold">Controla Temperatura (Cadena de Frío)</span>}
              {...form.register('controla_temperatura')}
            />

            {controlaTemperatura && (
              <div className="row mt-3">
                <div className="col-md-6">
                  <Form.Group controlId="temperatura_minima">
                    <Form.Label className="text-secondary small fw-medium">Mínima Permitida (°C)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.1"
                      placeholder="-18"
                      isInvalid={!!form.formState.errors.temperatura_minima}
                      {...form.register('temperatura_minima', {
                        required: controlaTemperatura ? 'Ingresá la mínima.' : false,
                        valueAsNumber: true
                      })}
                    />
                    <Form.Control.Feedback type="invalid">
                      {form.formState.errors.temperatura_minima?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>

                <div className="col-md-6 mt-3 mt-md-0">
                  <Form.Group controlId="temperatura_maxima">
                    <Form.Label className="text-secondary small fw-medium">Máxima Permitida (°C)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.1"
                      placeholder="-12"
                      isInvalid={!!form.formState.errors.temperatura_maxima}
                      {...form.register('temperatura_maxima', {
                        required: controlaTemperatura ? 'Ingresá la máxima.' : false,
                        valueAsNumber: true,
                        validate: (value) => {
                          if (!controlaTemperatura) return true;
                          const min = form.getValues('temperatura_minima');
                           if (value === '' || min === '') return true;
                          return Number(value) > Number(min) || 'La máxima debe superar a la mínima.';
                        }
                      })}
                    />
                    <Form.Control.Feedback type="invalid">
                      {form.formState.errors.temperatura_maxima?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
              </div>
            )}
          </Form.Group>

          <h6 className="text-secondary fw-bold mt-4 mb-3 border-bottom pb-2">Calibración y Mantenimiento</h6>
          <div className="row mb-4 bg-body-tertiary rounded p-2 pt-3 mx-0 border">
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
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

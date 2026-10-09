import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { loadAllPages } from '../../shared/libreria/options';
import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
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
  const esEdicion = Boolean(equipoInicial);
  const form = useForm<{
    numeroSerie: string;
    nombre: string;
    tipo: TipoEquipo;
    sectorId: number | '';
  }>({ defaultValues: { numeroSerie: '', nombre: '', tipo: 'equipo', sectorId: '' } });
  const enviando = form.formState.isSubmitting;
  const {
    field: {
      value: numeroSerie,
      onChange: setNumeroSerie,
      onBlur: numeroSerieBlur,
      ref: numeroSerieRef,
      name: numeroSerieName,
    },
  } = useController({
    name: 'numeroSerie',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });
  const {
    field: {
      value: nombre,
      onChange: setNombre,
      onBlur: nombreBlur,
      ref: nombreRef,
      name: nombreName,
    },
  } = useController({
    name: 'nombre',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });
  const {
    field: { value: tipo, onChange: setTipo, onBlur: tipoBlur, ref: tipoRef, name: tipoName },
  } = useController({
    name: 'tipo',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });
  const {
    field: {
      value: sectorId,
      onChange: setSectorId,
      onBlur: sectorIdBlur,
      ref: sectorIdRef,
      name: sectorIdName,
    },
  } = useController({
    name: 'sectorId',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });

  const [sectores, setSectores] = useState<Sector[]>([]);
  const [cargandoSectores, setCargandoSectores] = useState(true);

  useEffect(() => {
    loadAllPages((page) => getSectores(page, 100))
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
  }, [equipoInicial, setNumeroSerie, setNombre, setTipo, setSectorId]);

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    if (!numeroSerie.trim() || !nombre.trim() || sectorId === '') return;

    try {
      await onGuardar({
        numero_serie: numeroSerie.trim(),
        nombre: nombre.trim(),
        tipo,
        sector_id: Number(sectorId),
      });
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al guardar los datos.',
      });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Equipo: ${equipoInicial?.numero_serie}` : 'Registrar Nuevo Equipo'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={handleSubmit}>
          <FormErrors errors={form.formState.errors} />
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

          <div className="d-flex justify-content-end gap-2">
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

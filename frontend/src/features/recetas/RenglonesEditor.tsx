import { Badge, Button, Form, Table } from 'react-bootstrap';
import { useFieldArray, useWatch, type Control, type UseFormReturn } from 'react-hook-form';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { textoAditivo } from '../aditivos/aditivosApi';
import type { UnidadMedida } from '../unidadMedida/types';
import type { ValoresReceta } from './valoresReceta';
import type { InsumoDisponible, TipoInsumo } from './types';

interface RenglonesEditorProps {
  form: UseFormReturn<ValoresReceta>;
  tipo: TipoInsumo;
  insumos: InsumoDisponible[];
  unidades: UnidadMedida[];
}

function AditivoDelRenglon({
  control,
  indice,
  insumos,
}: {
  control: Control<ValoresReceta>;
  indice: number;
  insumos: InsumoDisponible[];
}) {
  const insumoId = useWatch({ control, name: `renglones.${indice}.insumo_id` });
  const aditivo = insumos.find((insumo) => String(insumo.id) === insumoId)?.aditivo_referencia;
  if (!insumoId) return <span className="text-body-secondary small">Elegí el aditivo</span>;
  if (!aditivo) {
    return (
      <Badge bg="danger" className="text-wrap">
        Sin clase funcional
      </Badge>
    );
  }
  return (
    <div className="small">
      <Badge bg="info" text="dark" className="me-1">
        {aditivo.clase_funcional.nombre}
      </Badge>
      <span className="text-body-secondary">{textoAditivo(aditivo)}</span>
    </div>
  );
}

export function RenglonesEditor({ form, tipo, insumos, unidades }: RenglonesEditorProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'renglones' });
  const { errors } = form.formState;
  const opciones = insumos.filter((insumo) => insumo.tipo === tipo);
  const filas = fields
    .map((campo, indice) => ({ campo, indice }))
    .filter(({ campo }) => campo.tipo === tipo);
  const esAditivo = tipo === 'aditivo';

  const alElegirInsumo = (indice: number, insumoId: string) => {
    const insumo = insumos.find((opcion) => String(opcion.id) === insumoId);
    if (insumo && !form.getValues(`renglones.${indice}.unidad_medida_id`)) {
      form.setValue(`renglones.${indice}.unidad_medida_id`, String(insumo.unidad_medida_id));
      form.clearErrors(`renglones.${indice}.unidad_medida_id`);
    }
  };

  return (
    <>
      {filas.length === 0 ? (
        <p className="text-body-secondary small mb-2">
          {esAditivo ? 'La receta no tiene aditivos.' : 'Agregá al menos un ingrediente.'}
        </p>
      ) : (
        <Table responsive size="sm" className="align-middle mb-2">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>{esAditivo ? 'Aditivo' : 'Ingrediente'}</th>
              {esAditivo && <th style={{ minWidth: 200 }}>Clase funcional / INS</th>}
              <th style={{ width: 130 }}>Cantidad</th>
              <th style={{ width: 120 }}>Unidad</th>
              <th style={{ width: 50 }} />
            </tr>
          </thead>
          <tbody>
            {filas.map(({ campo, indice }) => (
              <tr key={campo.id}>
                <td>
                  <SearchableSelect
                    size="sm"
                    aria-label={esAditivo ? 'Aditivo' : 'Ingrediente'}
                    isInvalid={!!errors.renglones?.[indice]?.insumo_id}
                    {...form.register(`renglones.${indice}.insumo_id`, {
                      required: esAditivo
                        ? 'Elegí el aditivo de cada renglón.'
                        : 'Elegí el ingrediente de cada renglón.',
                      validate: (valor, valores) =>
                        valores.renglones.filter((renglon) => renglon.insumo_id === valor)
                          .length === 1 || 'Hay insumos repetidos en la receta.',
                      onChange: (evento) => alElegirInsumo(indice, evento.target.value),
                    })}
                  >
                    <option value="">Buscá un insumo...</option>
                    {opciones.map((insumo) => (
                      <option key={insumo.id} value={insumo.id}>
                        {insumo.nombre}
                      </option>
                    ))}
                  </SearchableSelect>
                </td>
                {esAditivo && (
                  <td>
                    <AditivoDelRenglon control={form.control} indice={indice} insumos={insumos} />
                  </td>
                )}
                <td>
                  <Form.Control
                    size="sm"
                    inputMode="decimal"
                    aria-label="Cantidad"
                    isInvalid={!!errors.renglones?.[indice]?.cantidad}
                    {...form.register(`renglones.${indice}.cantidad`, {
                      validate: (valor) =>
                        Number(valor.replace(',', '.')) > 0 ||
                        'Cada renglón necesita una cantidad mayor a cero.',
                    })}
                  />
                </td>
                <td>
                  <Form.Select
                    size="sm"
                    aria-label="Unidad"
                    isInvalid={!!errors.renglones?.[indice]?.unidad_medida_id}
                    {...form.register(`renglones.${indice}.unidad_medida_id`, {
                      required: 'Cada renglón necesita su unidad de medida.',
                    })}
                  >
                    <option value="">—</option>
                    {unidades.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.sufijo}
                      </option>
                    ))}
                  </Form.Select>
                </td>
                <td className="text-end">
                  <Button
                    size="sm"
                    variant="outline-danger"
                    title="Quitar"
                    aria-label="Quitar renglón"
                    onClick={() => remove(indice)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Button
        size="sm"
        variant="outline-primary"
        onClick={() => append({ tipo, insumo_id: '', cantidad: '', unidad_medida_id: '' })}
      >
        <i className="bi bi-plus-lg me-1" aria-hidden="true" />
        {esAditivo ? 'Agregar aditivo' : 'Agregar ingrediente'}
      </Button>
      {esAditivo && opciones.length === 0 && (
        <p className="small text-body-secondary mt-2 mb-0">
          No hay insumos cargados como aditivo. Marcalos como aditivo en Insumos / Ingredientes.
        </p>
      )}
    </>
  );
}

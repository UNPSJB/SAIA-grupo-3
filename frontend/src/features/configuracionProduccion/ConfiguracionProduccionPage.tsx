import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FormErrors } from '../../shared/components/FormErrors';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import {
  actualizarConfiguracion,
  getConfiguracion,
  type FormatoAditivos,
} from './configuracionApi';

const FORMATOS: { valor: FormatoAditivos; titulo: string; ejemplo: string }[] = [
  {
    valor: 'funcion_nombre',
    titulo: 'Función y nombre',
    ejemplo: 'conservante: sorbato de potasio',
  },
  {
    valor: 'funcion_ins',
    titulo: 'Función y número INS',
    ejemplo: 'conservante: INS 202',
  },
  {
    valor: 'funcion_nombre_ins',
    titulo: 'Función, nombre y número INS',
    ejemplo: 'conservante: sorbato de potasio (INS 202)',
  },
];

export function ConfiguracionProduccionPage() {
  const configuracion = useConsulta(getConfiguracion, []);
  const form = useForm<{ formato_aditivos: FormatoAditivos }>({
    defaultValues: { formato_aditivos: 'funcion_nombre_ins' },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const [guardado, setGuardado] = useState(false);
  const { reset } = form;
  const elegido = useWatch({ control: form.control, name: 'formato_aditivos' });

  useEffect(() => {
    if (configuracion.datos) reset({ formato_aditivos: configuracion.datos.formato_aditivos });
  }, [configuracion.datos, reset]);

  const guardar = form.handleSubmit(async (datos) => {
    try {
      await actualizarConfiguracion(datos.formato_aditivos);
      setGuardado(true);
      configuracion.recargar();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo guardar la configuración.',
      });
    }
  });

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Configuración de producción</h2>
      {configuracion.error && <ErrorAlert mensaje={configuracion.error} />}
      {!configuracion.datos && !configuracion.error && <LoadingSpinner mensaje="Cargando..." />}
      {configuracion.datos && (
        <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '720px' }}>
          <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
            Declaración de aditivos en el rótulo
          </Card.Header>
          <Card.Body className="p-4">
            <Form noValidate onSubmit={guardar}>
              <FormErrors key={submitCount} errors={errors} />
              {guardado && !errors.root && (
                <Alert variant="success" className="py-2">
                  Configuración guardada. Las listas de ingredientes usan el formato nuevo.
                </Alert>
              )}
              <p className="text-body-secondary">
                Define cómo se escribe cada aditivo en la lista de ingredientes. Las clases marcadas
                para declararse solo por su función (por ejemplo, los aromatizantes) muestran solo
                la función.
              </p>
              <div className="d-flex flex-column gap-2 mb-4">
                {FORMATOS.map((formato) => (
                  <Form.Check
                    key={formato.valor}
                    type="radio"
                    id={`formato-${formato.valor}`}
                    value={formato.valor}
                    className={`border rounded p-3 ps-5 ${elegido === formato.valor ? 'border-primary bg-primary-subtle' : ''}`}
                    label={
                      <>
                        <span className="fw-semibold d-block">{formato.titulo}</span>
                        <span className="small text-body-secondary">Ej.: {formato.ejemplo}</span>
                      </>
                    }
                    {...form.register('formato_aditivos', { onChange: () => setGuardado(false) })}
                  />
                ))}
              </div>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="small text-body-secondary">
                  {configuracion.datos.actualizado_por
                    ? `Última modificación: ${configuracion.datos.actualizado_por.nombre} ${configuracion.datos.actualizado_por.apellido}, ${formatearFechaHora(configuracion.datos.actualizado_en)}`
                    : 'Formato por defecto: función, nombre y número INS.'}
                </span>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

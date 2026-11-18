import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Badge, Button, Card, Container, Form, Modal, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FormErrors } from '../../shared/components/FormErrors';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { MaestroAcciones } from '../aditivos/MaestroAcciones';
import { bajaAlergeno, guardarAlergeno, listarAlergenos } from './alergenosApi';
import type { Alergeno, AlergenoDatos } from './types';

const VACIO: AlergenoDatos = {
  nombre: '',
  grupo: '',
  texto_declaracion: '',
  implica_gluten: false,
  descripcion: null,
  orden: 0,
};

function AlergenoForm({
  alergeno,
  onGuardado,
  onCancelar,
}: {
  alergeno: Alergeno | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const form = useForm<AlergenoDatos>({ defaultValues: VACIO });
  const { errors, isSubmitting, submitCount } = form.formState;
  const { reset } = form;

  useEffect(() => {
    reset(
      alergeno
        ? {
            nombre: alergeno.nombre,
            grupo: alergeno.grupo,
            texto_declaracion: alergeno.texto_declaracion,
            implica_gluten: alergeno.implica_gluten,
            descripcion: alergeno.descripcion,
            orden: alergeno.orden,
          }
        : VACIO,
    );
  }, [alergeno, reset]);

  const obligatorio = (mensaje: string) => (valor: string | null) => !!valor?.trim() || mensaje;

  const enviar = form.handleSubmit(async (datos) => {
    try {
      await guardarAlergeno(
        {
          ...datos,
          nombre: datos.nombre.trim(),
          grupo: datos.grupo.trim(),
          texto_declaracion: datos.texto_declaracion.trim(),
          descripcion: datos.descripcion?.trim() || null,
          orden: Number(datos.orden) || 0,
        },
        alergeno?.id,
      );
      onGuardado();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo guardar.',
      });
    }
  });

  return (
    <Form noValidate onSubmit={enviar}>
      <Modal.Body>
        <FormErrors key={submitCount} errors={errors} />
        <Form.Group controlId="alergeno-nombre" className="mb-3">
          <Form.Label>Nombre</Form.Label>
          <Form.Control
            placeholder="Ej.: Trigo"
            isInvalid={!!errors.nombre}
            {...form.register('nombre', { validate: obligatorio('El nombre es obligatorio.') })}
          />
        </Form.Group>
        <Form.Group controlId="alergeno-grupo" className="mb-3">
          <Form.Label>Grupo del CAA</Form.Label>
          <Form.Control
            placeholder="Ej.: Cereales que contienen gluten"
            isInvalid={!!errors.grupo}
            {...form.register('grupo', { validate: obligatorio('Indicá el grupo.') })}
          />
        </Form.Group>
        <Form.Group controlId="alergeno-texto" className="mb-3">
          <Form.Label>Cómo se nombra en el rótulo</Form.Label>
          <Form.Control
            placeholder="Ej.: trigo"
            isInvalid={!!errors.texto_declaracion}
            {...form.register('texto_declaracion', {
              validate: obligatorio('Indicá el texto del rótulo.'),
            })}
          />
          <Form.Text>Se usa para armar «CONTIENE …» y «PUEDE CONTENER …».</Form.Text>
        </Form.Group>
        <Form.Group controlId="alergeno-orden" className="mb-3" style={{ maxWidth: '10rem' }}>
          <Form.Label>Orden</Form.Label>
          <Form.Control
            type="number"
            min={0}
            max={999}
            {...form.register('orden', { valueAsNumber: true })}
          />
        </Form.Group>
        <Form.Group controlId="alergeno-gluten" className="mb-3">
          <Form.Check
            type="switch"
            label="Es un cereal con gluten (TACC): marca el producto como que contiene gluten"
            {...form.register('implica_gluten')}
          />
        </Form.Group>
        <Form.Group controlId="alergeno-descripcion">
          <Form.Label>Descripción (opcional)</Form.Label>
          <Form.Control as="textarea" rows={2} {...form.register('descripcion')} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </Modal.Footer>
    </Form>
  );
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return <Badge bg={activo ? 'success' : 'danger'}>{activo ? 'Activo' : 'Inactivo'}</Badge>;
}

export function AlergenosPage() {
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const { datos, error, cargando, recargar } = useConsulta(
    () => listarAlergenos(mostrarInactivos),
    [mostrarInactivos],
  );
  const [editando, setEditando] = useState<Alergeno | null | undefined>(undefined);
  const [baja, setBaja] = useState<Alergeno | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cerrar = () => setEditando(undefined);
  const guardado = () => {
    cerrar();
    recargar();
  };

  const reactivar = async (alergeno: Alergeno) => {
    setErrorAccion(null);
    try {
      await guardarAlergeno({ activo: true }, alergeno.id);
      recargar();
    } catch (err: unknown) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo reactivar.');
    }
  };

  const confirmarBaja = async () => {
    if (!baja) return;
    setEnviando(true);
    setErrorAccion(null);
    try {
      await bajaAlergeno(baja.id);
      setBaja(null);
      recargar();
    } catch (err: unknown) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo dar de baja.');
    } finally {
      setEnviando(false);
    }
  };

  const acciones = (alergeno: Alergeno) => (
    <MaestroAcciones
      activo={alergeno.activo}
      onModificar={() => setEditando(alergeno)}
      onBaja={() => setBaja(alergeno)}
      onReactivar={() => void reactivar(alergeno)}
    />
  );

  return (
    <Container className="py-2">
      <h2 className="mb-3 border-bottom pb-2 text-secondary">Alérgenos</h2>
      <Alert variant="info" className="small">
        Grupos de declaración obligatoria del Código Alimentario Argentino (art. 235 séptimo). Marcá
        en cada insumo los alérgenos que aporta: el rótulo propone «CONTIENE …» a partir de la
        receta vigente.
      </Alert>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <Form.Check
          id="alergenos-inactivos"
          type="switch"
          label="Ver dados de baja"
          checked={mostrarInactivos}
          onChange={(e) => setMostrarInactivos(e.target.checked)}
        />
        <Button variant="success" onClick={() => setEditando(null)}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Nuevo alérgeno
        </Button>
      </div>
      {error && <ErrorAlert mensaje={error} />}
      {errorAccion && <ErrorAlert mensaje={errorAccion} />}
      {cargando && <LoadingSpinner mensaje="Cargando alérgenos..." />}
      {datos && (
        <>
          <Card className="shadow-sm border-0 d-none d-md-block">
            <Card.Body className="p-0">
              <Table striped hover className="mb-0 align-middle">
                <thead className="table-theme">
                  <tr>
                    <th>Nombre</th>
                    <th>Grupo</th>
                    <th>En el rótulo</th>
                    <th>Gluten (TACC)</th>
                    <th>Estado</th>
                    <th className="text-center" style={{ width: '150px' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((alergeno) => (
                    <tr key={alergeno.id}>
                      <td className="fw-semibold">{alergeno.nombre}</td>
                      <td>{alergeno.grupo}</td>
                      <td>{alergeno.texto_declaracion.toUpperCase()}</td>
                      <td>
                        {alergeno.implica_gluten ? (
                          <Badge bg="warning" text="dark">
                            Sí
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <EstadoBadge activo={alergeno.activo} />
                      </td>
                      <td className="text-center">{acciones(alergeno)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          <div className="d-md-none d-flex flex-column gap-2">
            {datos.map((alergeno) => (
              <Card key={alergeno.id} className="shadow-sm border-0">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fw-semibold">
                        {alergeno.nombre}
                        {alergeno.implica_gluten && (
                          <Badge bg="warning" text="dark" className="ms-2 fw-normal">
                            Gluten
                          </Badge>
                        )}
                      </div>
                      <div className="small text-muted">{alergeno.grupo}</div>
                    </div>
                    <EstadoBadge activo={alergeno.activo} />
                  </div>
                  <div className="d-flex justify-content-end mt-2">{acciones(alergeno)}</div>
                </Card.Body>
              </Card>
            ))}
          </div>
          {datos.length === 0 && (
            <p className="text-center text-muted py-4">No hay alérgenos cargados.</p>
          )}
        </>
      )}
      <Modal show={editando !== undefined} onHide={cerrar} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h5">
            {editando ? `Modificar: ${editando.nombre}` : 'Nuevo alérgeno'}
          </Modal.Title>
        </Modal.Header>
        {editando !== undefined && (
          <AlergenoForm alergeno={editando} onGuardado={guardado} onCancelar={cerrar} />
        )}
      </Modal>
      <Modal show={!!baja} onHide={() => setBaja(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Dar de baja: {baja?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Deja de estar disponible para marcar insumos y deja de proponerse en los rótulos. Las
          declaraciones confirmadas que lo incluían vuelven a quedar como sugeridas.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setBaja(null)} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void confirmarBaja()} disabled={enviando}>
            {enviando ? 'Dando de baja...' : 'Dar de baja'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

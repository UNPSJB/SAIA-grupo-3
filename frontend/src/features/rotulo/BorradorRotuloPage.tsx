import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  ProgressBar,
  Row,
  Table,
} from 'react-bootstrap';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { getUnidadesMedidaActivas } from '../unidadMedida/unidadMedidaApi';
import { Octogono } from '../rotuladoFrontal/Octogono';
import { CampoAutomatico } from './CampoAutomatico';
import { confirmarAlergenos, crearBorrador, getBorrador, guardarBorrador } from './rotuloApi';
import { SeccionAlergenos } from './SeccionAlergenos';
import type { ConservacionFormulario } from './SeccionAlergenos';
import type {
  Borrador,
  BorradorDatos,
  CampoAutomatico as Campo,
  TipoRegistro,
  UnidadVidaUtil,
} from './types';

interface Formulario
  extends
    Omit<
      BorradorDatos,
      | 'contenido_neto'
      | 'vida_util_cantidad'
      | 'contenido_neto_unidad_id'
      | keyof ConservacionFormulario
    >,
    ConservacionFormulario {
  contenido_neto: string;
  contenido_neto_unidad_id: string;
  vida_util_cantidad: string;
}

const texto = (valor: string | null | undefined) => valor ?? '';
const opcional = (valor: string) => (valor.trim() === '' ? null : valor.trim());
const numeroTexto = (valor: number | null) =>
  valor === null ? '' : String(valor).replace('.', ',');

function aFormulario(b: Borrador): Formulario {
  return {
    denominacion_venta: texto(b.denominacion_venta),
    lista_ingredientes: texto(b.lista_ingredientes),
    identificacion_lote: texto(b.identificacion_lote),
    contenido_neto: b.contenido_neto === null ? '' : String(b.contenido_neto).replace('.', ','),
    contenido_neto_unidad_id: b.contenido_neto_unidad ? String(b.contenido_neto_unidad.id) : '',
    razon_social: texto(b.razon_social),
    domicilio: texto(b.domicilio),
    pais_origen: texto(b.pais_origen),
    tipo_registro: b.tipo_registro,
    numero_registro: texto(b.numero_registro),
    numero_establecimiento: texto(b.numero_establecimiento),
    es_importado: b.es_importado,
    importador_razon_social: texto(b.importador_razon_social),
    importador_domicilio: texto(b.importador_domicilio),
    vida_util_cantidad: b.vida_util_cantidad === null ? '' : String(b.vida_util_cantidad),
    vida_util_unidad: b.vida_util_unidad,
    leyenda_duracion: b.leyenda_duracion,
    requiere_instrucciones: b.requiere_instrucciones,
    instrucciones: texto(b.instrucciones),
    puede_contener_ids: b.alergenos.puede_contener.map((a) => a.id),
    conservacion_condicion: b.conservacion_condicion,
    conservacion_temp_min: numeroTexto(b.conservacion_temp_min),
    conservacion_temp_max: numeroTexto(b.conservacion_temp_max),
    conservacion_duracion_cantidad: numeroTexto(b.conservacion_duracion_cantidad),
    conservacion_duracion_unidad: b.conservacion_duracion_unidad,
    conservacion_abierto: texto(b.conservacion_abierto),
  };
}

function aNumero(valor: string): number | null {
  return valor.trim() ? Number(valor.replace(',', '.')) : null;
}

function Seccion({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm border-0 mb-3" id={id}>
      <Card.Header as="h6" className="bg-body-tertiary text-secondary py-3 mb-0">
        {titulo}
      </Card.Header>
      <Card.Body className="p-3 p-md-4">{children}</Card.Body>
    </Card>
  );
}

const RESULTADO_FRONTAL = {
  no_corresponde: 'No corresponde rotulado frontal',
  exceptuado: 'Exceptuado del rotulado frontal',
  corresponde: 'Corresponde rotulado frontal',
};

export function BorradorRotuloPage() {
  const { productoId } = useParams();
  const id = Number(productoId);
  const navigate = useNavigate();
  const consulta = useConsulta(() => getBorrador(id), [id]);
  const unidades = useConsulta(getUnidadesMedidaActivas, []);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [verEdiciones, setVerEdiciones] = useState(false);

  const actual = borrador ?? consulta.datos;
  const { hash } = useLocation();
  const listo = Boolean(actual);

  useEffect(() => {
    if (!listo || !hash.startsWith('#campo-')) return;
    const campo = hash.slice('#campo-'.length);
    const espera = window.setTimeout(() => {
      const destino =
        document.getElementById(`campo-${campo}`) ?? document.getElementById(`seccion-${campo}`);
      destino?.scrollIntoView({ block: 'center' });
      if (
        destino instanceof HTMLInputElement ||
        destino instanceof HTMLTextAreaElement ||
        destino instanceof HTMLSelectElement
      )
        destino.focus();
    }, 150);
    return () => window.clearTimeout(espera);
  }, [listo, hash]);
  if (consulta.error && !actual) {
    const sinBorrador = consulta.error.includes('todavía no tiene borrador');
    return (
      <Container className="py-2">
        <ErrorAlert mensaje={consulta.error} />
        {sinBorrador && (
          <Button
            onClick={async () => {
              try {
                setBorrador(await crearBorrador(id));
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'No se pudo crear el borrador.');
              }
            }}
          >
            Crear borrador
          </Button>
        )}
        {error && <ErrorAlert mensaje={error} />}
      </Container>
    );
  }
  if (!actual) return <LoadingSpinner mensaje="Cargando borrador de rótulo..." />;

  const f = formulario ?? aFormulario(actual);
  const cambiar = (cambios: Partial<Formulario>) => {
    setAviso(null);
    setFormulario({ ...f, ...cambios });
  };
  const auto = (campo: Campo) => actual.automaticos.find((a) => a.campo === campo)!;
  const unidadesContenido = (unidades.datos ?? []).filter(
    (u) => u.tipo === 'peso' || u.tipo === 'capacidad',
  );

  const ir = (campo: string) => {
    const destino =
      document.getElementById(`campo-${campo}`) ?? document.getElementById(`seccion-${campo}`);
    destino?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (destino instanceof HTMLInputElement || destino instanceof HTMLTextAreaElement)
      destino.focus();
  };

  const hayCambios =
    formulario !== null && JSON.stringify(formulario) !== JSON.stringify(aFormulario(actual));

  const enviar = async (): Promise<Borrador | null> => {
    const contenido = f.contenido_neto.trim() ? Number(f.contenido_neto.replace(',', '.')) : null;
    const vida = f.vida_util_cantidad.trim() ? Number(f.vida_util_cantidad) : null;
    if (contenido !== null && (Number.isNaN(contenido) || contenido <= 0)) {
      setError('El contenido neto debe ser un número mayor a cero.');
      return null;
    }
    if (vida !== null && (!Number.isInteger(vida) || vida <= 0)) {
      setError('La vida útil debe ser un número entero mayor a cero.');
      return null;
    }
    const temperaturaMinima = aNumero(f.conservacion_temp_min);
    const temperaturaMaxima = aNumero(f.conservacion_temp_max);
    const duracion = aNumero(f.conservacion_duracion_cantidad);
    if ([temperaturaMinima, temperaturaMaxima].some((t) => t !== null && Number.isNaN(t))) {
      setError('Las temperaturas de conservación deben ser números.');
      return null;
    }
    if (duracion !== null && (!Number.isInteger(duracion) || duracion <= 0)) {
      setError(
        'La duración en las condiciones de conservación debe ser un número entero mayor a cero.',
      );
      return null;
    }
    const conCondicion = f.conservacion_condicion !== null;
    setError(null);
    const nuevo = await guardarBorrador(id, {
      denominacion_venta: opcional(f.denominacion_venta ?? ''),
      lista_ingredientes: opcional(f.lista_ingredientes ?? ''),
      identificacion_lote: opcional(f.identificacion_lote ?? ''),
      contenido_neto: contenido,
      contenido_neto_unidad_id: f.contenido_neto_unidad_id
        ? Number(f.contenido_neto_unidad_id)
        : null,
      razon_social: opcional(f.razon_social ?? ''),
      domicilio: opcional(f.domicilio ?? ''),
      pais_origen: opcional(f.pais_origen ?? ''),
      tipo_registro: f.tipo_registro,
      numero_registro: opcional(f.numero_registro ?? ''),
      numero_establecimiento: opcional(f.numero_establecimiento ?? ''),
      es_importado: f.es_importado,
      importador_razon_social: opcional(f.importador_razon_social ?? ''),
      importador_domicilio: opcional(f.importador_domicilio ?? ''),
      vida_util_cantidad: vida,
      vida_util_unidad: f.vida_util_unidad,
      leyenda_duracion: opcional(f.leyenda_duracion ?? ''),
      requiere_instrucciones: f.requiere_instrucciones,
      instrucciones: opcional(f.instrucciones ?? ''),
      puede_contener_ids: f.puede_contener_ids,
      conservacion_condicion: f.conservacion_condicion,
      conservacion_temp_min: conCondicion ? temperaturaMinima : null,
      conservacion_temp_max: conCondicion ? temperaturaMaxima : null,
      conservacion_duracion_cantidad: conCondicion ? duracion : null,
      conservacion_duracion_unidad: f.conservacion_duracion_unidad,
      conservacion_abierto: opcional(f.conservacion_abierto),
    });
    setBorrador(nuevo);
    setFormulario(aFormulario(nuevo));
    return nuevo;
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const nuevo = await enviar();
      if (!nuevo) return;
      setAviso(
        nuevo.completitud.faltantes.length
          ? `Borrador guardado. Faltan ${nuevo.completitud.faltantes.length} datos obligatorios.`
          : 'Borrador guardado: tiene todos los datos obligatorios.',
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el borrador.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmar = async () => {
    setConfirmando(true);
    setAviso(null);
    try {
      if (hayCambios && !(await enviar())) return;
      const nuevo = await confirmarAlergenos(id);
      setBorrador(nuevo);
      setFormulario(aFormulario(nuevo));
      setAviso('Declaración de alérgenos confirmada.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la declaración.');
    } finally {
      setConfirmando(false);
    }
  };

  const { completitud } = actual;
  const nutricion = actual.informacion_nutricional;
  const frontal = actual.rotulado_frontal;

  return (
    <Container className="py-2">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center border-bottom pb-2 mb-3">
        <div>
          <h2 className="text-secondary mb-0">Rótulo · {actual.producto.nombre}</h2>
          <div className="small text-body-secondary">
            Actualizado {formatearFechaHora(actual.actualizado_en)} por{' '}
            {actual.actualizado_por.nombre} {actual.actualizado_por.apellido}
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="outline-primary"
            onClick={() => navigate(`/rotulado/${id}/vista-previa`)}
            disabled={guardando || confirmando}
            title={hayCambios ? 'La vista previa usa los datos guardados' : undefined}
          >
            <i className="bi bi-eye me-1" aria-hidden="true" />
            Vista previa
          </Button>
          <Button variant="outline-secondary" onClick={() => navigate('/rotulado')}>
            Volver
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 mb-3 sticky-top" style={{ top: '0.5rem', zIndex: 5 }}>
        <Card.Body className="py-3">
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
              <div className="d-flex justify-content-between small mb-1">
                <span className="fw-semibold">Completitud</span>
                <span>
                  {completitud.completos} de {completitud.total} · {completitud.porcentaje} %
                </span>
              </div>
              <ProgressBar
                now={completitud.porcentaje}
                variant={completitud.porcentaje === 100 ? 'success' : 'warning'}
                aria-label={`${completitud.porcentaje} % completo`}
              />
            </div>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar borrador'}
            </Button>
          </div>
          {completitud.faltantes.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-2 small">
              <span className="text-body-secondary me-1">Faltan:</span>
              {completitud.faltantes.map((faltante) => (
                <Button
                  key={faltante.campo}
                  size="sm"
                  variant="outline-warning"
                  className="py-0 text-body"
                  onClick={() => ir(faltante.campo)}
                >
                  {faltante.etiqueta}
                </Button>
              ))}
            </div>
          )}
          <div className="small text-body-secondary mt-2">
            Se puede guardar aunque falten datos: la completitud solo informa.
          </div>
        </Card.Body>
      </Card>

      {error && <ErrorAlert mensaje={error} />}
      {aviso && (
        <Alert variant="success" className="py-2" dismissible onClose={() => setAviso(null)}>
          {aviso}
        </Alert>
      )}

      <Seccion id="seccion-denominacion_venta" titulo="1. Denominación de venta">
        <CampoAutomatico
          estado={auto('denominacion_venta')}
          valor={f.denominacion_venta ?? ''}
          ayuda="Nombre específico que indica la naturaleza del producto (no la marca)."
          onChange={(valor) => cambiar({ denominacion_venta: valor })}
        />
      </Seccion>

      <Seccion id="seccion-lista_ingredientes" titulo="2. Lista de ingredientes">
        <CampoAutomatico
          estado={auto('lista_ingredientes')}
          valor={f.lista_ingredientes ?? ''}
          multilinea
          ayuda="En orden decreciente de proporción, con los aditivos por su función."
          onChange={(valor) => cambiar({ lista_ingredientes: valor })}
        />
      </Seccion>

      <Seccion id="seccion-alergenos" titulo="3. Alérgenos y conservación">
        <SeccionAlergenos
          declaracion={actual.alergenos}
          leyendaConservacion={actual.leyenda_conservacion}
          recetaId={nutricion?.receta_id ?? null}
          valores={f}
          hayCambios={hayCambios}
          confirmando={confirmando}
          onCambiar={cambiar}
          onConfirmar={() => void confirmar()}
        />
      </Seccion>

      <Seccion id="seccion-contenido_neto" titulo="4. Contenido neto">
        <Row className="g-2">
          <Col sm={6} md={4}>
            <Form.Label htmlFor="campo-contenido_neto">Cantidad</Form.Label>
            <InputGroup>
              <Form.Control
                id="campo-contenido_neto"
                inputMode="decimal"
                value={f.contenido_neto}
                onChange={(e) => cambiar({ contenido_neto: e.target.value })}
              />
              <Form.Select
                aria-label="Unidad del contenido neto"
                value={f.contenido_neto_unidad_id}
                onChange={(e) => cambiar({ contenido_neto_unidad_id: e.target.value })}
                style={{ maxWidth: '7rem' }}
              >
                <option value="">—</option>
                {unidadesContenido.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.sufijo}
                  </option>
                ))}
              </Form.Select>
            </InputGroup>
          </Col>
        </Row>
      </Seccion>

      <Seccion id="seccion-origen" titulo="5. Identificación del origen">
        <Row className="g-3">
          <Col md={6}>
            <Form.Group controlId="campo-razon_social">
              <Form.Label>Razón social del elaborador</Form.Label>
              <Form.Control
                maxLength={200}
                value={f.razon_social ?? ''}
                onChange={(e) => cambiar({ razon_social: e.target.value })}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="campo-pais_origen">
              <Form.Label>País de origen</Form.Label>
              <Form.Control
                maxLength={100}
                value={f.pais_origen ?? ''}
                onChange={(e) => cambiar({ pais_origen: e.target.value })}
              />
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Group controlId="campo-domicilio">
              <Form.Label>Domicilio</Form.Label>
              <Form.Control
                maxLength={300}
                value={f.domicilio ?? ''}
                onChange={(e) => cambiar({ domicilio: e.target.value })}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Label htmlFor="campo-numero_registro">Registro del producto</Form.Label>
            <InputGroup>
              <Form.Select
                aria-label="Tipo de registro"
                value={f.tipo_registro ?? ''}
                onChange={(e) =>
                  cambiar({ tipo_registro: (e.target.value || null) as TipoRegistro | null })
                }
                style={{ maxWidth: '7rem' }}
              >
                <option value="">—</option>
                <option value="rnpa">RNPA</option>
                <option value="rppa">RPPA</option>
              </Form.Select>
              <Form.Control
                id="campo-numero_registro"
                maxLength={60}
                placeholder="Número"
                value={f.numero_registro ?? ''}
                onChange={(e) => cambiar({ numero_registro: e.target.value })}
              />
            </InputGroup>
            <Form.Text>
              <i className="bi bi-info-circle me-1" aria-hidden="true" />
              Dato declarado, no verificado contra registros oficiales.
            </Form.Text>
          </Col>
          <Col md={6}>
            <Form.Group controlId="campo-numero_establecimiento">
              <Form.Label>Registro del establecimiento (RNE/RPE)</Form.Label>
              <Form.Control
                maxLength={60}
                value={f.numero_establecimiento ?? ''}
                onChange={(e) => cambiar({ numero_establecimiento: e.target.value })}
              />
              <Form.Text>Opcional. Dato declarado, no verificado.</Form.Text>
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Check
              type="switch"
              id="campo-es_importado"
              label="Es un producto importado"
              checked={f.es_importado}
              onChange={(e) => cambiar({ es_importado: e.target.checked })}
            />
          </Col>
          {f.es_importado && (
            <>
              <Col md={6}>
                <Form.Group controlId="campo-importador_razon_social">
                  <Form.Label>Razón social del importador</Form.Label>
                  <Form.Control
                    maxLength={200}
                    value={f.importador_razon_social ?? ''}
                    onChange={(e) => cambiar({ importador_razon_social: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="campo-importador_domicilio">
                  <Form.Label>Domicilio del importador</Form.Label>
                  <Form.Control
                    maxLength={300}
                    value={f.importador_domicilio ?? ''}
                    onChange={(e) => cambiar({ importador_domicilio: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </>
          )}
        </Row>
      </Seccion>

      <Seccion id="seccion-identificacion_lote" titulo="6. Identificación del lote">
        <CampoAutomatico
          estado={auto('identificacion_lote')}
          valor={f.identificacion_lote ?? ''}
          ayuda="Código del último lote producido. Si cada envase lleva su lote impreso, podés poner «Ver envase»."
          onChange={(valor) => cambiar({ identificacion_lote: valor })}
        />
      </Seccion>

      <Seccion id="seccion-vida_util_cantidad" titulo="7. Fecha de duración">
        <Row className="g-2 align-items-end">
          <Col sm={6} md={3}>
            <Form.Label htmlFor="campo-vida_util_cantidad">Vida útil</Form.Label>
            <InputGroup>
              <Form.Control
                id="campo-vida_util_cantidad"
                type="number"
                min={1}
                value={f.vida_util_cantidad}
                onChange={(e) => cambiar({ vida_util_cantidad: e.target.value })}
              />
              <Form.Select
                aria-label="Unidad de la vida útil"
                value={f.vida_util_unidad}
                onChange={(e) => cambiar({ vida_util_unidad: e.target.value as UnidadVidaUtil })}
              >
                <option value="dias">días</option>
                <option value="meses">meses</option>
              </Form.Select>
            </InputGroup>
          </Col>
          <Col sm={6} md={6}>
            <Form.Group controlId="campo-leyenda_duracion">
              <Form.Label>Leyenda</Form.Label>
              <Form.Control
                maxLength={150}
                value={f.leyenda_duracion ?? ''}
                onChange={(e) => cambiar({ leyenda_duracion: e.target.value })}
              />
            </Form.Group>
          </Col>
        </Row>
        <Form.Text>
          La fecha se calcula con la fecha de elaboración de cada lote más la vida útil.
        </Form.Text>
      </Seccion>

      <Seccion id="seccion-instrucciones" titulo="8. Preparación e instrucciones de uso">
        <Form.Check
          type="switch"
          id="campo-requiere_instrucciones"
          label="El producto necesita instrucciones de preparación o de uso"
          checked={f.requiere_instrucciones}
          onChange={(e) => cambiar({ requiere_instrucciones: e.target.checked })}
        />
        {f.requiere_instrucciones && (
          <Form.Control
            id="campo-instrucciones"
            as="textarea"
            rows={3}
            className="mt-2"
            maxLength={2000}
            aria-label="Instrucciones de uso"
            value={f.instrucciones ?? ''}
            onChange={(e) => cambiar({ instrucciones: e.target.value })}
          />
        )}
      </Seccion>

      <Seccion id="seccion-informacion_nutricional" titulo="9. Información nutricional">
        {nutricion ? (
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Badge bg="info" text="dark" className="fw-normal">
              <i className="bi bi-magic me-1" aria-hidden="true" />
              de la receta v{nutricion.numero}
            </Badge>
            {nutricion.completa ? (
              <Badge bg="success">Completa</Badge>
            ) : (
              <Badge bg="warning" text="dark">
                Incompleta: {nutricion.faltantes}{' '}
                {nutricion.faltantes === 1 ? 'dato faltante' : 'datos faltantes'}
              </Badge>
            )}
            <span className="small text-body-secondary">
              Calculada {formatearFechaHora(nutricion.calculada_en)}
            </span>
            <Link to={`/recetas/${nutricion.receta_id}`} className="small ms-auto">
              Ver o completar en la receta
            </Link>
          </div>
        ) : (
          <Alert variant="warning" className="mb-0 py-2">
            El producto no tiene receta: sin receta no hay información nutricional.
          </Alert>
        )}
      </Seccion>

      {frontal && (
        <Seccion id="seccion-rotulado_frontal" titulo="10. Rotulado frontal">
          {!frontal.resultado ? (
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span>Todavía no se evaluó si corresponde.</span>
              <Link to={`/productos/${actual.producto.id}`} className="small">
                Evaluar en el producto
              </Link>
            </div>
          ) : (
            <>
              <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                <Badge bg="info" text="dark" className="fw-normal">
                  <i className="bi bi-magic me-1" aria-hidden="true" />
                  {frontal.calculado_en
                    ? `del cálculo del ${formatearFechaHora(frontal.calculado_en)}`
                    : 'de la evaluación del producto'}
                </Badge>
                <strong>{RESULTADO_FRONTAL[frontal.resultado]}</strong>
                {frontal.provisorio && (
                  <Badge bg="warning" text="dark">
                    Provisorio
                  </Badge>
                )}
                {frontal.conjunto_numero && (
                  <span className="small text-body-secondary">
                    parámetros v{frontal.conjunto_numero} (vigencia{' '}
                    {formatearFecha(frontal.conjunto_fecha_vigencia)})
                  </span>
                )}
                <Link to={`/productos/${actual.producto.id}`} className="small ms-auto">
                  Ver en el producto
                </Link>
              </div>
              {frontal.resultado === 'corresponde' && !frontal.calculo_id && (
                <div className="small text-warning-emphasis">
                  Corresponde, pero todavía no se calcularon los sellos.
                </div>
              )}
              {frontal.leyendas.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                  {frontal.leyendas.map((leyenda) => (
                    <Octogono key={leyenda} leyenda={leyenda} tamano={78} />
                  ))}
                </div>
              )}
            </>
          )}
        </Seccion>
      )}

      {actual.ediciones.length > 0 && (
        <div className="mb-4">
          <Button
            variant="link"
            className="p-0 text-decoration-none"
            aria-expanded={verEdiciones}
            onClick={() => setVerEdiciones(!verEdiciones)}
          >
            {verEdiciones
              ? '▾ Ocultar ediciones a mano'
              : `▸ Ver ediciones a mano (${actual.ediciones.length})`}
          </Button>
          {verEdiciones && (
            <Table responsive size="sm" className="small mt-2 align-middle">
              <thead>
                <tr className="text-body-secondary">
                  <th>Fecha</th>
                  <th>Dato</th>
                  <th>Del sistema</th>
                  <th>Antes</th>
                  <th>Después</th>
                  <th>Persona</th>
                </tr>
              </thead>
              <tbody>
                {actual.ediciones.map((e) => (
                  <tr key={e.id}>
                    <td className="text-nowrap">{formatearFechaHora(e.fecha_hora)}</td>
                    <td>{e.etiqueta}</td>
                    <td>
                      {e.valor_sistema ?? '—'}
                      <div className="text-body-secondary">{e.origen}</div>
                    </td>
                    <td>{e.valor_original ?? '—'}</td>
                    <td>{e.valor_nuevo ?? '—'}</td>
                    <td className="text-nowrap">
                      {e.personal.nombre} {e.personal.apellido}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </Container>
  );
}

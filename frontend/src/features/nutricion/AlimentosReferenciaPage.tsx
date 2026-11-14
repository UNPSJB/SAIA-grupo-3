import { useRef, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { buscarAlimentos, importarAlimentos } from './nutricionApi';
import { formatearValor } from './formato';
import { CAMPO_DE_NUTRIENTE, NUTRIENTES_TODOS, type ResultadoImportacion } from './types';

const COLUMNAS_EJEMPLO =
  'codigo;nombre;grupo;energia_kcal;carbohidratos_g;azucares_totales_g;azucares_anadidos_g;proteinas_g;grasas_totales_g;grasas_saturadas_g;grasas_trans_g;fibra_g;sodio_mg';

export function AlimentosReferenciaPage() {
  const [fuente, setFuente] = useState('SARA 2');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [revision, setRevision] = useState(0);
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const alimentos = useConsulta(() => buscarAlimentos(buscar, 100), [buscar, revision]);

  const importar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!archivo || !fuente.trim()) {
      setError('Elegí el archivo CSV e indicá de qué fuente es.');
      return;
    }
    setImportando(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(await importarAlimentos(archivo, fuente.trim()));
      setArchivo(null);
      if (entradaArchivo.current) entradaArchivo.current.value = '';
      setRevision((valor) => valor + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo importar el archivo.');
    } finally {
      setImportando(false);
    }
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Alimentos de referencia</h2>
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          Importar tabla de composición
        </Card.Header>
        <Card.Body className="p-3 p-md-4">
          <p className="text-body-secondary small">
            Subí un CSV con valores por 100 g. Se puede volver a importar el mismo archivo: los
            alimentos se actualizan por fuente y código, sin duplicarse. Columnas:
          </p>
          <pre className="small bg-body-tertiary p-2 rounded text-wrap mb-3">
            {COLUMNAS_EJEMPLO}
          </pre>
          <Form noValidate onSubmit={importar}>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Group controlId="Alimentos-fuente">
                  <Form.Label>Fuente</Form.Label>
                  <Form.Control
                    maxLength={60}
                    value={fuente}
                    onChange={(evento) => setFuente(evento.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group controlId="Alimentos-archivo">
                  <Form.Label>Archivo CSV</Form.Label>
                  <Form.Control
                    ref={entradaArchivo}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={(evento) =>
                      setArchivo((evento.target as HTMLInputElement).files?.[0] ?? null)
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Button type="submit" className="w-100" disabled={importando}>
                  {importando ? 'Importando...' : 'Importar'}
                </Button>
              </Col>
            </Row>
          </Form>
          {error && (
            <div className="mt-3">
              <ErrorAlert mensaje={error} />
            </div>
          )}
          {resultado && (
            <Alert variant={resultado.errores.length ? 'warning' : 'success'} className="mt-3 mb-0">
              <div>
                {resultado.fuente}: {resultado.creados} nuevos, {resultado.actualizados}{' '}
                actualizados, {resultado.sin_cambios} sin cambios.
              </div>
              {resultado.errores.length > 0 && (
                <ul className="mb-0 mt-2 small">
                  {resultado.errores.map((mensaje) => (
                    <li key={mensaje}>{mensaje}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-body-tertiary py-3">
          <Form
            className="d-flex flex-wrap gap-2 align-items-center"
            onSubmit={(evento) => {
              evento.preventDefault();
              setBuscar(texto.trim());
            }}
          >
            <h5 className="mb-0 text-secondary me-auto">Alimentos cargados</h5>
            <Form.Control
              aria-label="Buscar alimento"
              placeholder="Buscar por nombre, código o grupo"
              style={{ maxWidth: '20rem' }}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
            />
            <Button type="submit" variant="outline-primary">
              Buscar
            </Button>
          </Form>
        </Card.Header>
        <Card.Body className="p-0">
          {alimentos.error && <ErrorAlert mensaje={alimentos.error} />}
          {!alimentos.datos && !alimentos.error && <LoadingSpinner mensaje="Cargando..." />}
          {alimentos.datos && alimentos.datos.length === 0 && (
            <p className="text-body-secondary p-3 mb-0">No hay alimentos para mostrar.</p>
          )}
          {alimentos.datos && alimentos.datos.length > 0 && (
            <Table responsive hover size="sm" className="mb-0 small align-middle">
              <thead>
                <tr>
                  <th className="ps-3">Alimento</th>
                  {NUTRIENTES_TODOS.map((n) => (
                    <th key={n.nutriente} className="text-end text-nowrap">
                      {n.etiqueta} ({n.unidad})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alimentos.datos.map((alimento) => (
                  <tr key={alimento.id}>
                    <td className="ps-3" style={{ minWidth: '14rem' }}>
                      <div className="fw-semibold">{alimento.nombre}</div>
                      <div className="text-body-secondary">
                        {alimento.fuente} · {alimento.codigo}
                        {alimento.grupo ? ` · ${alimento.grupo}` : ''}
                      </div>
                    </td>
                    {NUTRIENTES_TODOS.map((n) => (
                      <td key={n.nutriente} className="text-end">
                        {formatearValor(alimento[CAMPO_DE_NUTRIENTE[n.nutriente]] as number | null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

import { useState } from 'react';
import { Alert, Button, Form, ListGroup, Modal, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { buscarAlimentos } from './nutricionApi';
import { formatearValor } from './formato';
import { CAMPO_DE_NUTRIENTE, type AlimentoReferencia, type NutrienteDisponible } from './types';

interface Props {
  show: boolean;
  nutrientes: NutrienteDisponible[];
  tieneValores: boolean;
  onCerrar: () => void;
  onCopiar: (alimento: AlimentoReferencia) => Promise<void>;
}

export function BuscadorReferencia({ show, nutrientes, tieneValores, onCerrar, onCopiar }: Props) {
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [elegido, setElegido] = useState<AlimentoReferencia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiando, setCopiando] = useState(false);
  const resultados = useConsulta(
    () => (show ? buscarAlimentos(buscar) : Promise.resolve([])),
    [show, buscar],
  );

  const cerrar = () => {
    setElegido(null);
    setError(null);
    onCerrar();
  };

  const copiar = async () => {
    if (!elegido) return;
    setCopiando(true);
    setError(null);
    try {
      await onCopiar(elegido);
      cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron copiar los valores.');
    } finally {
      setCopiando(false);
    }
  };

  return (
    <Modal show={show} onHide={cerrar} size="lg" fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title as="h5">Copiar desde la base de referencia</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          className="d-flex gap-2 mb-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            setElegido(null);
            setBuscar(texto.trim());
          }}
        >
          <Form.Control
            aria-label="Buscar alimento"
            placeholder="Buscá por nombre, código o grupo (ej. harina de trigo)"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          <Button type="submit" variant="outline-primary">
            Buscar
          </Button>
        </Form>
        {resultados.error && <ErrorAlert mensaje={resultados.error} />}
        {resultados.cargando && !resultados.datos && <LoadingSpinner mensaje="Buscando..." />}
        {resultados.datos && resultados.datos.length === 0 && (
          <Alert variant="secondary" className="py-2">
            No hay alimentos que coincidan. Si la base está vacía, importala desde Maestros de
            producción → Alimentos de referencia.
          </Alert>
        )}
        <div className="row g-3">
          {resultados.datos && resultados.datos.length > 0 && (
            <div className="col-md-5">
              <ListGroup className="overflow-auto" style={{ maxHeight: '22rem' }}>
                {resultados.datos.map((alimento) => (
                  <ListGroup.Item
                    key={alimento.id}
                    action
                    active={elegido?.id === alimento.id}
                    onClick={() => setElegido(alimento)}
                  >
                    <div className="fw-semibold">{alimento.nombre}</div>
                    <div className="small opacity-75">
                      {alimento.fuente} · {alimento.codigo}
                      {alimento.grupo ? ` · ${alimento.grupo}` : ''}
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}
          {elegido && (
            <div className="col-md-7">
              <h6 className="text-secondary mb-2">Vista previa por 100 g</h6>
              <Table size="sm" bordered className="mb-2">
                <tbody>
                  {nutrientes.map((n) => (
                    <tr key={n.nutriente}>
                      <td>{n.etiqueta}</td>
                      <td className="text-end">
                        {formatearValor(
                          elegido[CAMPO_DE_NUTRIENTE[n.nutriente]] as number | null,
                          n.unidad,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <p className="small text-body-secondary mb-0">
                Los nutrientes que el alimento no informa quedan sin dato.
                {tieneValores &&
                  ' Reemplaza los valores que el insumo ya tiene para esos nutrientes.'}
              </p>
            </div>
          )}
        </div>
        {error && <ErrorAlert mensaje={error} />}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={cerrar}>
          Cancelar
        </Button>
        <Button onClick={copiar} disabled={!elegido || copiando}>
          {copiando ? 'Copiando...' : 'Copiar valores'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

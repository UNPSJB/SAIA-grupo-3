import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { cantidadConUnidad, numeroDesdeTexto } from '../recetas/formato';
import { escalarReceta, getVersion } from '../recetas/recetaApi';
import type { ModoEscalado, RecetaVigente, Version } from '../recetas/types';
import { precargaDesde } from './precarga';
import type { PrecargaLote } from './types';

interface PrecargaDesdeRecetaProps {
  receta: RecetaVigente;
  aplicada: boolean;
  onPrecargar: (precarga: PrecargaLote) => void;
}

export function PrecargaDesdeReceta({ receta, aplicada, onPrecargar }: PrecargaDesdeRecetaProps) {
  const [version, setVersion] = useState<Version | null>(null);
  const [modo, setModo] = useState<ModoEscalado>('cantidad_objetivo');
  const [valor, setValor] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getVersion(receta.version_vigente.id)
      .then((datos) => {
        if (activo) setVersion(datos);
      })
      .catch(() => {
        if (activo) setVersion(null);
      });
    return () => {
      activo = false;
    };
  }, [receta.version_vigente.id]);

  const precargar = async () => {
    const numero = numeroDesdeTexto(valor);
    if (!(numero > 0)) {
      setError('Ingresá un valor mayor a cero.');
      return;
    }
    setCalculando(true);
    setError(null);
    try {
      onPrecargar(precargaDesde(await escalarReceta(receta.receta_id, modo, numero)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo escalar la receta.');
    } finally {
      setCalculando(false);
    }
  };

  return (
    <Card className="mb-3 border-primary-subtle">
      <Card.Body className="py-3">
        <div className="fw-semibold mb-2">
          <i className="bi bi-journal-bookmark me-2" aria-hidden="true" />
          {aplicada ? 'Volver a escalar la receta' : 'Precargar desde la receta'}
          <span className="fw-normal text-body-secondary ms-2">
            versión {receta.version_vigente.numero}
            {version &&
              ` · rinde ${cantidadConUnidad(version.rendimiento_cantidad, version.rendimiento_unidad.sufijo)}`}
          </span>
        </div>
        <Row className="g-2 align-items-center">
          <Col md={5}>
            <div className="d-flex flex-wrap gap-3">
              <Form.Check
                id="precarga-modo-cantidad"
                type="radio"
                name="precarga-modo"
                label="Cantidad a elaborar"
                checked={modo === 'cantidad_objetivo'}
                onChange={() => setModo('cantidad_objetivo')}
              />
              <Form.Check
                id="precarga-modo-factor"
                type="radio"
                name="precarga-modo"
                label="Factor multiplicador"
                checked={modo === 'factor'}
                onChange={() => setModo('factor')}
              />
            </div>
          </Col>
          <Col sm={7} md={4}>
            <InputGroup hasValidation>
              {modo === 'factor' && <InputGroup.Text>×</InputGroup.Text>}
              <Form.Control
                aria-label={modo === 'factor' ? 'Factor multiplicador' : 'Cantidad a elaborar'}
                inputMode="decimal"
                placeholder={modo === 'factor' ? 'Ej: 2' : 'Ej: 50'}
                value={valor}
                isInvalid={!!error}
                onChange={(evento) => {
                  setValor(evento.target.value);
                  setError(null);
                }}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    evento.preventDefault();
                    void precargar();
                  }
                }}
              />
              {modo === 'cantidad_objetivo' && version && (
                <InputGroup.Text>{version.rendimiento_unidad.sufijo}</InputGroup.Text>
              )}
            </InputGroup>
          </Col>
          <Col sm={5} md={3}>
            <Button
              variant="outline-primary"
              className="w-100"
              disabled={calculando}
              onClick={() => void precargar()}
            >
              {calculando ? 'Calculando...' : 'Precargar insumos'}
            </Button>
          </Col>
        </Row>
        {error && (
          <Alert variant="danger" className="mt-2 mb-0 py-2">
            {error}
          </Alert>
        )}
        {aplicada && (
          <Form.Text>Al volver a escalar se reemplazan los insumos y cantidades cargados.</Form.Text>
        )}
      </Card.Body>
    </Card>
  );
}

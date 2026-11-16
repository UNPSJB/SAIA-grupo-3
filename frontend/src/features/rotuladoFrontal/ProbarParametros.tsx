import { useState } from 'react';
import { Alert, Badge, Button, Col, Form, Row, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { HECHOS, RESULTADOS } from './etiquetas';
import { probarParametros } from './rotuladoApi';
import type { Hecho, NutrienteEvaluable, ResultadoPrueba, TipoProducto } from './types';

const CAMPOS: { nutriente: NutrienteEvaluable; etiqueta: string }[] = [
  { nutriente: 'energia', etiqueta: 'Valor energético (kcal)' },
  { nutriente: 'azucares_anadidos', etiqueta: 'Azúcares añadidos (g)' },
  { nutriente: 'grasas_totales', etiqueta: 'Grasas totales (g)' },
  { nutriente: 'grasas_saturadas', etiqueta: 'Grasas saturadas (g)' },
  { nutriente: 'sodio', etiqueta: 'Sodio (mg)' },
];

const numero = (texto: string) => {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? null : Number(limpio);
};

export function ProbarParametros({
  conjuntoId,
  hayCambios,
}: {
  conjuntoId: number;
  hayCambios: boolean;
}) {
  const [tipo, setTipo] = useState<TipoProducto>('solido');
  const [valores, setValores] = useState<Partial<Record<NutrienteEvaluable, string>>>({
    energia: '450',
    azucares_anadidos: '10,8',
    grasas_totales: '14',
    grasas_saturadas: '6',
    sodio: '380',
  });
  const [porcion, setPorcion] = useState('');
  const [hechos, setHechos] = useState<Hecho[]>([
    'envasado_ausencia_cliente',
    'agrega_azucares',
    'agrega_grasas',
    'agrega_sodio',
  ]);
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);

  const probar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const por_100 = Object.fromEntries(
      CAMPOS.map(({ nutriente }) => [nutriente, numero(valores[nutriente] ?? '')]),
    );
    if (Object.values(por_100).some((v) => v !== null && (Number.isNaN(v) || v < 0))) {
      setError('Los valores deben ser números mayores o iguales a cero.');
      return;
    }
    setProbando(true);
    setError(null);
    try {
      setResultado(
        await probarParametros(
          { tipo, por_100, energia_porcion: numero(porcion), hechos },
          conjuntoId,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo probar el conjunto.');
    } finally {
      setProbando(false);
    }
  };

  return (
    <div className="p-3 p-md-4">
      <p className="small text-body-secondary">
        Cargá valores por 100 g o ml de un producto de ejemplo para ver cómo los evalúa esta
        versión.
        {hayCambios && ' Se usa la versión guardada: guardá el borrador para probar tus cambios.'}
      </p>
      <Form onSubmit={probar}>
        <Row className="g-2">
          <Col md={2}>
            <Form.Label htmlFor="probar-tipo" className="small mb-1">
              Producto
            </Form.Label>
            <Form.Select
              id="probar-tipo"
              size="sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoProducto)}
            >
              <option value="solido">Sólido</option>
              <option value="liquido">Líquido</option>
            </Form.Select>
          </Col>
          {CAMPOS.map(({ nutriente, etiqueta }) => (
            <Col key={nutriente} xs={6} md={2}>
              <Form.Label htmlFor={`probar-${nutriente}`} className="small mb-1">
                {etiqueta}
              </Form.Label>
              <Form.Control
                id={`probar-${nutriente}`}
                size="sm"
                inputMode="decimal"
                value={valores[nutriente] ?? ''}
                onChange={(e) => setValores({ ...valores, [nutriente]: e.target.value })}
              />
            </Col>
          ))}
          <Col xs={6} md={2}>
            <Form.Label htmlFor="probar-porcion" className="small mb-1">
              kcal por porción
            </Form.Label>
            <Form.Control
              id="probar-porcion"
              size="sm"
              inputMode="decimal"
              placeholder="Opcional"
              value={porcion}
              onChange={(e) => setPorcion(e.target.value)}
            />
          </Col>
          <Col xs={12}>
            <div className="d-flex flex-wrap gap-3 mt-1">
              {(Object.keys(HECHOS) as Hecho[]).map((hecho) => (
                <Form.Check
                  key={hecho}
                  id={`probar-${hecho}`}
                  className="small"
                  label={HECHOS[hecho]}
                  checked={hechos.includes(hecho)}
                  onChange={(e) =>
                    setHechos(
                      e.target.checked ? [...hechos, hecho] : hechos.filter((h) => h !== hecho),
                    )
                  }
                />
              ))}
            </div>
          </Col>
        </Row>
        <Button type="submit" size="sm" className="mt-3" disabled={probando}>
          {probando ? 'Probando...' : 'Probar'}
        </Button>
      </Form>
      {error && (
        <div className="mt-3">
          <ErrorAlert mensaje={error} />
        </div>
      )}
      {resultado && (
        <div className="mt-3">
          <Alert variant="light" className="border py-2">
            <Badge bg={RESULTADOS[resultado.aplicabilidad.resultado].color} className="me-2">
              {RESULTADOS[resultado.aplicabilidad.resultado].etiqueta}
            </Badge>
            <span className="small">{resultado.aplicabilidad.mensaje}</span>
            <div className="small text-body-secondary mt-1">
              Calculado con la versión {resultado.conjunto.numero} ({resultado.conjunto.estado})
            </div>
          </Alert>
          {resultado.aplicabilidad.resultado === 'corresponde' && (
            <>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {resultado.leyendas.length === 0 && (
                  <span className="small text-body-secondary">No corresponde ningún sello.</span>
                )}
                {resultado.leyendas.map((leyenda) => (
                  <Badge key={leyenda} bg="dark" className="p-2">
                    {leyenda}
                  </Badge>
                ))}
                {resultado.advertencias.map((texto) => (
                  <Badge key={texto} bg="light" text="dark" className="p-2 border border-dark">
                    {texto}
                  </Badge>
                ))}
              </div>
              <Table responsive size="sm" className="small align-middle mb-0">
                <thead>
                  <tr className="text-body-secondary">
                    <th>Sello</th>
                    <th>Cálculo</th>
                    <th className="text-nowrap">Umbral</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.detalle.map((d) => (
                    <tr key={d.orden}>
                      <td className="text-nowrap">{d.leyenda}</td>
                      <td>
                        {d.operacion ?? <span className="text-body-secondary">{d.motivo}</span>}
                      </td>
                      <td className="text-nowrap">
                        {d.simbolo} {d.limite.toLocaleString('es-AR')} {d.unidad}
                      </td>
                      <td>
                        {!d.evaluado ? (
                          <Badge bg="light" text="dark" className="border">
                            No evaluado
                          </Badge>
                        ) : d.supera ? (
                          <Badge bg="danger">Supera</Badge>
                        ) : (
                          <Badge bg="success">No supera</Badge>
                        )}
                        {d.evaluado && d.motivo && (
                          <div className="text-body-secondary">{d.motivo}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

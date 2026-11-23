import { useState } from 'react';
import { Button, Container } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { ModalAnularPaso } from './ModalAnularPaso';
import { ModalRealizarPaso } from './ModalRealizarPaso';
import { getProduccionDelDia } from './produccionDelDiaApi';
import { TarjetaLote } from './TarjetaLote';
import type { PasoLote } from './types';

export function ProduccionDelDiaPage() {
  const lotes = useConsulta(getProduccionDelDia, []);
  const [aRealizar, setARealizar] = useState<PasoLote | null>(null);
  const [aAnular, setAAnular] = useState<PasoLote | null>(null);
  const [params] = useSearchParams();
  const loteElegido = Number(params.get('lote')) || null;
  const visibles = loteElegido
    ? lotes.datos?.filter((lote) => lote.id === loteElegido)
    : lotes.datos;

  const alTerminar = () => {
    setARealizar(null);
    setAAnular(null);
    lotes.recargar();
  };

  return (
    <Container className="py-2">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
        <h2 className="text-secondary mb-0">Producción del día</h2>
        <Button variant="outline-success" onClick={lotes.recargar} disabled={lotes.cargando}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
          Actualizar
        </Button>
      </div>
      <p className="text-body-secondary mb-4 border-bottom pb-3">
        Marcá cada paso de la receta a medida que lo hacés.
      </p>
      {loteElegido && (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <span className="small text-body-secondary">Mostrando solo el lote seleccionado.</span>
          <Link to="/produccion-del-dia" className="small">
            Ver todos los lotes
          </Link>
        </div>
      )}
      {lotes.error && <ErrorAlert mensaje={lotes.error} />}
      {!lotes.datos && !lotes.error && <LoadingSpinner mensaje="Cargando lotes..." />}
      {lotes.datos?.length === 0 && (
        <div className="text-center text-body-secondary py-5">
          <p className="mb-2">No tenés lotes abiertos con pasos para seguir.</p>
          <p className="small mb-0">
            Iniciá un lote desde una <Link to="/recetas">receta</Link> para que aparezcan sus pasos.
          </p>
        </div>
      )}
      {loteElegido && lotes.datos && lotes.datos.length > 0 && visibles?.length === 0 && (
        <div className="text-center text-body-secondary py-5">
          <p className="mb-0">Este lote no tiene pasos pendientes para seguir.</p>
        </div>
      )}
      <div className="d-flex flex-column gap-4">
        {visibles?.map((lote) => (
          <TarjetaLote key={lote.id} lote={lote} onRealizar={setARealizar} onAnular={setAAnular} />
        ))}
      </div>
      <ModalRealizarPaso
        paso={aRealizar}
        onCerrar={() => setARealizar(null)}
        onRealizado={alTerminar}
      />
      <ModalAnularPaso paso={aAnular} onCerrar={() => setAAnular(null)} onAnulado={alTerminar} />
    </Container>
  );
}

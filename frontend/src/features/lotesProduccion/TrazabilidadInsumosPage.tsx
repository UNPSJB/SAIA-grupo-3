import { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { buscarLotesRecepcion, getTrazabilidadLoteRecepcion } from './trazabilidadApi';
import { TrazabilidadInsumosView } from './TrazabilidadInsumosView';
import type { ConsumoRecepcion, LoteRecepcion, Pagina } from '../abastecimiento/types';

type ResultadoBusqueda =
  | { busqueda: string; page: number; datos: Pagina<LoteRecepcion>; error: null }
  | { busqueda: string; page: number; datos: null; error: string };

type ResultadoDetalle =
  | { loteId: number; usos: ConsumoRecepcion[]; error: null }
  | { loteId: number; usos: null; error: string };

export function TrazabilidadInsumosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [resultadoBusqueda, setResultadoBusqueda] = useState<ResultadoBusqueda | null>(null);
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState<number | null>(null);
  const [resultadoDetalle, setResultadoDetalle] = useState<ResultadoDetalle | null>(null);

  useEffect(() => {
    let activo = true;
    const temporizador = window.setTimeout(() => {
      buscarLotesRecepcion(busqueda, page)
        .then((datos) => {
          if (activo) setResultadoBusqueda({ busqueda, page, datos, error: null });
        })
        .catch((err: unknown) => {
          if (activo)
            setResultadoBusqueda({
              busqueda,
              page,
              datos: null,
              error:
                err instanceof Error
                  ? err.message
                  : 'No se pudieron cargar las recepciones de insumos.',
            });
        });
    }, busqueda ? 300 : 0);

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [busqueda, page]);

  useEffect(() => {
    if (loteSeleccionadoId === null) return;
    let activo = true;
    getTrazabilidadLoteRecepcion(loteSeleccionadoId)
      .then((usos) => {
        if (activo) setResultadoDetalle({ loteId: loteSeleccionadoId, usos, error: null });
      })
      .catch((err: unknown) => {
        if (activo)
          setResultadoDetalle({
            loteId: loteSeleccionadoId,
            usos: null,
            error:
              err instanceof Error
                ? err.message
                : 'No se pudo consultar la trazabilidad del lote.',
          });
      });

    return () => {
      activo = false;
    };
  }, [loteSeleccionadoId]);

  const resultadoActual =
    resultadoBusqueda?.busqueda === busqueda && resultadoBusqueda.page === page
      ? resultadoBusqueda
      : null;
  const detalleActual =
    resultadoDetalle?.loteId === loteSeleccionadoId ? resultadoDetalle : null;
  const loteSeleccionado =
    resultadoActual?.datos?.items.find((lote) => lote.id === loteSeleccionadoId) ?? null;

  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPage(1);
    setLoteSeleccionadoId(null);
    setResultadoDetalle(null);
  };

  const verDetalles = (loteId: number) => {
    setResultadoDetalle(null);
    setLoteSeleccionadoId(loteId);
  };

  const volverAlListado = () => {
    setLoteSeleccionadoId(null);
    setResultadoDetalle(null);
  };

  return (
    <Container className="py-2">
      <TrazabilidadInsumosView
        busqueda={busqueda}
        lotes={resultadoBusqueda?.datos?.items ?? []}
        total={resultadoBusqueda?.datos?.total ?? 0}
        page={page}
        pages={resultadoBusqueda?.datos?.pages ?? 0}
        loading={resultadoActual === null}
        error={resultadoActual?.error ?? null}
        onBusquedaChange={cambiarBusqueda}
        onPageChange={setPage}
        onVerDetalles={verDetalles}
        onVolver={volverAlListado}
        loteSeleccionado={loteSeleccionado}
        usos={detalleActual?.usos ?? null}
        loadingDetalle={loteSeleccionadoId !== null && detalleActual === null}
        errorDetalle={detalleActual?.error ?? null}
      />
    </Container>
  );
}

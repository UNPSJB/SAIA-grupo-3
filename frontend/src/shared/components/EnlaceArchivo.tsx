import { useState, type ReactNode } from 'react';
import { abrirArchivo } from '../libreria/archivos';

interface EnlaceArchivoProps {
  ruta: string;
  children: ReactNode;
  className?: string;
  title?: string;
  'aria-label'?: string;
}

export function EnlaceArchivo({ ruta, children, className, title, 'aria-label': ariaLabel }: EnlaceArchivoProps) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = async () => {
    setAbriendo(true);
    setError(null);
    try {
      await abrirArchivo(ruta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el archivo.');
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className ?? 'btn btn-link p-0 align-baseline'}
        title={title}
        aria-label={ariaLabel}
        disabled={abriendo}
        onClick={() => void abrir()}
      >
        {children}
      </button>
      {error && <small className="d-block text-danger">{error}</small>}
    </>
  );
}

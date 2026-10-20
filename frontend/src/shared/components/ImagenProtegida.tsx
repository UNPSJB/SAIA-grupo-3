import { useEffect, useState, type CSSProperties } from 'react';
import { Spinner } from 'react-bootstrap';
import { obtenerArchivo } from '../libreria/archivos';

interface ImagenProtegidaProps {
  ruta: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}

export function ImagenProtegida({ ruta, alt, className, style }: ImagenProtegidaProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    let urlCreada: string | null = null;
    obtenerArchivo(ruta)
      .then((blob) => {
        if (!activo) return;
        urlCreada = URL.createObjectURL(blob);
        setUrl(urlCreada);
      })
      .catch((err: unknown) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.');
      });
    return () => {
      activo = false;
      if (urlCreada) URL.revokeObjectURL(urlCreada);
    };
  }, [ruta]);

  if (error) return <div className="text-danger small">{error}</div>;
  if (!url) return <Spinner animation="border" size="sm" />;
  return <img src={url} alt={alt} className={className} style={style} />;
}

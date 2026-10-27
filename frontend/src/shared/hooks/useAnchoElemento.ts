import { useEffect, useRef, useState } from 'react';

/** Ancho en píxeles de un elemento, actualizado al cambiar el tamaño de la pantalla. */
export function useAnchoElemento<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) =>
      setAncho(Math.floor(entrada.contentRect.width)),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return { ref, ancho };
}

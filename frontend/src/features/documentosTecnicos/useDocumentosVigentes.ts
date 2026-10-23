import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import {
  API_BASE_URL,
  fetchWithAuth,
  mensajeDeError,
} from '../../shared/libreria/api';
import type { TipoDocumentoTecnico } from './types';

interface DocumentoVigente {
  id: number;
  nombre: string;
  tipo: TipoDocumentoTecnico;
  fecha_vigencia: string | null;
  version_vigente: {
    id: number;
    numero: number;
    nombre_original: string;
    tipo_contenido: string;
  } | null;
}

interface VersionHistorial {
  id: number;
  numero: number;
  estado: 'vigente' | 'archivado';
  fecha_subida: string;
  nombre_original: string;
  tipo_contenido: string;
}

interface VistaArchivo {
  url: string;
  tipo: string;
  titulo: string;
}

const esVisualizable = (tipo: string) =>
  tipo === 'application/pdf' || tipo.startsWith('image/');

export function useDocumentosVigentes() {
  const [params] = useSearchParams();
  const tipo = params.get('tipo') || '';

  const lista = usePagedList<DocumentoVigente>(
    'documentos-vigentes/',
    true,
    tipo ? `&tipo=${encodeURIComponent(tipo)}` : '',
    'nombre',
  );

  const [seleccionado, setSeleccionado] =
    useState<DocumentoVigente | null>(null);

  const detalle =
    lista.items.find((doc) => doc.id === seleccionado?.id) || seleccionado;

  const [versionElegida, setVersionElegida] = useState('');
  const [vista, setVista] = useState<VistaArchivo | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [historial, setHistorial] = useState<DocumentoVigente | null>(null);
  const [versiones, setVersiones] = useState<VersionHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  const consultaHistorial = useRef(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;

    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (vista) URL.revokeObjectURL(vista.url);
    },
    [vista],
  );

  async function verHistorial(doc: DocumentoVigente) {
    const consulta = ++consultaHistorial.current;

    setHistorial(doc);
    setVersionElegida('');
    setVersiones([]);
    setErrorHistorial(null);
    setErrorArchivo(null);
    setCargandoHistorial(true);

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/documentos-vigentes/${doc.id}/historial`,
      );

      const datos = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          mensajeDeError(datos.detail, 'No se pudo cargar el historial.'),
        );
      }

      if (montado.current && consulta === consultaHistorial.current) {
        setVersiones(datos);
      }
    } catch (error) {
      if (montado.current && consulta === consultaHistorial.current) {
        setErrorHistorial(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el historial.',
        );
      }
    } finally {
      if (montado.current && consulta === consultaHistorial.current) {
        setCargandoHistorial(false);
      }
    }
  }

  function cerrarHistorial() {
    consultaHistorial.current++;
    setHistorial(null);
  }

  async function abrirArchivo(
    doc: DocumentoVigente,
    visualizar: boolean,
    version?: VersionHistorial,
  ) {
    setOcupado(doc.id);
    setErrorArchivo(null);

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/documentos-vigentes/${doc.id}/${
          version ? `historial/${version.id}/archivo` : 'archivo'
        }`,
      );

      if (!res.ok) {
        const datos = await res.json().catch(() => ({}));

        throw new Error(
          mensajeDeError(
            datos.detail,
            'No se pudo cargar el archivo de esta versión.',
          ),
        );
      }

      const blob = await res.blob();

      if (!montado.current) return;

      const numero = res.headers.get('X-Version-Numero');
      const versionId = Number(res.headers.get('X-Version-Id'));
      const nombre = decodeURIComponent(
        res.headers.get('X-Archivo-Nombre') || 'documento',
      );

      if (!version && versionId !== doc.version_vigente?.id) {
        lista.refetch();
      }

      const archivada = res.headers.get('X-Version-Estado') === 'archivado';
      const url = URL.createObjectURL(blob);

      if (visualizar && esVisualizable(blob.type)) {
        setVista({
          url,
          tipo: blob.type,
          titulo: `${doc.nombre} — v${numero}${
            archivada
              ? ' — Archivada: no usar para operar'
              : ' — Vigente'
          }`,
        });
      } else {
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (montado.current) {
        setErrorArchivo(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el archivo.',
        );
        lista.refetch();
      }
    } finally {
      if (montado.current) setOcupado(null);
    }
  }

  return {
    tipo,
    lista,
    detalle,
    setSeleccionado,
    versionElegida,
    setVersionElegida,
    vista,
    setVista,
    errorArchivo,
    setErrorArchivo,
    ocupado,
    historial,
    versiones,
    cargandoHistorial,
    errorHistorial,
    verHistorial,
    abrirArchivo,
    cerrarHistorial,
  };
}
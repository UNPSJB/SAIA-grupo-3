import { Button, Container } from 'react-bootstrap';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { useOptions } from '../../shared/hooks/useOptions';
import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { Equipo } from '../equipos/types';
import type { UnidadMedida } from '../unidadMedida/types';
import {
  crearReceta,
  getInsumosDisponibles,
  getReceta,
  guardarNuevaVersion,
  listarRecetas,
} from './recetaApi';
import { RecetaForm } from './RecetaForm';
import type { Receta } from './types';

async function getUnidadesActivas(): Promise<UnidadMedida[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/unidades-medida/activas`);
  if (!res.ok)
    throw new Error(await mensajeDeRespuesta(res, 'No se pudieron cargar las unidades.'));
  return res.json();
}

async function cargarDatos(recetaId: number | null) {
  const [insumos, unidades, recetas, receta] = await Promise.all([
    getInsumosDisponibles(),
    getUnidadesActivas(),
    listarRecetas(),
    recetaId ? getReceta(recetaId) : Promise.resolve<Receta | null>(null),
  ]);
  return { insumos, unidades, recetas, receta };
}

export function RecetaFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const recetaId = id ? Number(id) : null;
  const datos = useConsulta(() => cargarDatos(recetaId), [recetaId]);
  const equipos = useOptions<Equipo>('equipos');

  const titulo = recetaId ? 'Modificar receta' : 'Nueva receta';
  if (datos.error) {
    return (
      <Container className="py-2">
        <h2 className="mb-4 border-bottom pb-2 text-secondary">{titulo}</h2>
        <ErrorAlert mensaje={datos.error} />
        <Button onClick={() => navigate('/recetas')}>Volver a recetas</Button>
      </Container>
    );
  }
  if (!datos.datos) return <LoadingSpinner mensaje="Preparando el formulario..." />;

  const { insumos, unidades, recetas, receta } = datos.datos;
  const productos = receta
    ? [receta.producto]
    : recetas
        .filter((item) => !item.receta_id && item.producto.activo)
        .map((item) => item.producto);
  const productoInicial = receta ? String(receta.producto.id) : (params.get('producto') ?? '');

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        {receta ? `${titulo}: ${receta.producto.nombre}` : titulo}
      </h2>
      {equipos.error && <ErrorAlert mensaje={equipos.error} />}
      <RecetaForm
        key={receta?.version_vigente.id ?? 'nueva'}
        productos={productos}
        productoInicial={productoInicial}
        versionBase={receta?.version_vigente}
        insumos={insumos}
        unidades={unidades}
        equipos={equipos.items.filter((equipo) => equipo.activo !== false)}
        onCancelar={() => navigate(receta ? `/recetas/${receta.id}` : '/recetas')}
        onGuardar={async (valores, version) => {
          const guardada = receta
            ? await guardarNuevaVersion(receta.id, {
                ...version,
                version_base_id: receta.version_vigente.id,
                motivo: valores.motivo.trim(),
              })
            : await crearReceta({
                ...version,
                producto_id: Number(valores.producto_id),
                motivo: valores.motivo.trim() || undefined,
              });
          navigate(`/recetas/${guardada.id}`, {
            state: { mensaje: `Se creó la versión ${guardada.version_vigente.numero}.` },
          });
        }}
      />
    </Container>
  );
}

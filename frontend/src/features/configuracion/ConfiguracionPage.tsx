import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { useRotuladoFrontalActivo } from '../rotuladoFrontal/useRotuladoFrontalActivo';
import './ConfiguracionPage.css';

const AREAS = [
  {
    id: 'produccion',
    titulo: 'Producción y rotulado',
    icono: 'bi-basket',
    descripcion: 'Referencias y reglas que acompañan tus productos.',
  },
  {
    id: 'limpieza',
    titulo: 'Limpieza',
    icono: 'bi-bucket',
    descripcion: 'Catálogos de apoyo para organizar la limpieza.',
  },
  {
    id: 'sistema',
    titulo: 'Sistema',
    icono: 'bi-sliders',
    descripcion: 'Documentación y presentación de tu establecimiento.',
  },
] as const;

const ACCESOS = [
  {
    area: 'produccion',
    ruta: '/unidades-medida',
    titulo: 'Unidades de medida',
    icono: 'bi-rulers',
    descripcion: 'Unidades y equivalencias para tus insumos.',
  },
  {
    area: 'produccion',
    ruta: '/clases-funcionales',
    titulo: 'Clases funcionales',
    icono: 'bi-tags',
    descripcion: 'Funciones de los aditivos en las recetas.',
  },
  {
    area: 'produccion',
    ruta: '/aditivos-referencia',
    titulo: 'Aditivos de referencia',
    icono: 'bi-capsule',
    descripcion: 'Catálogo de aditivos y sus identificaciones.',
  },
  {
    area: 'produccion',
    ruta: '/alimentos-referencia',
    titulo: 'Alimentos de referencia',
    icono: 'bi-clipboard2-pulse',
    descripcion: 'Fuentes de información nutricional.',
  },
  {
    area: 'produccion',
    ruta: '/alergenos',
    titulo: 'Alérgenos',
    icono: 'bi-exclamation-octagon',
    descripcion: 'Catálogo para declarar alérgenos.',
  },
  {
    area: 'produccion',
    ruta: '/valores-diarios',
    titulo: 'Valores diarios y redondeo',
    icono: 'bi-percent',
    descripcion: 'Referencias para las tablas nutricionales.',
  },
  {
    area: 'produccion',
    ruta: '/parametros-normativos',
    titulo: 'Parámetros normativos',
    icono: 'bi-journal-check',
    descripcion: 'Versiones, umbrales y reglas de octógonos.',
  },
  {
    area: 'produccion',
    ruta: '/configuracion-produccion',
    titulo: 'Configuración de producción',
    icono: 'bi-sliders',
    descripcion: 'Preferencias del circuito productivo.',
  },
  {
    area: 'limpieza',
    ruta: '/elementos',
    titulo: 'Elementos de limpieza',
    icono: 'bi-bucket',
    descripcion: 'Utensilios y elementos utilizados en las tareas.',
  },
  {
    area: 'limpieza',
    ruta: '/sectores',
    titulo: 'Sectores',
    icono: 'bi-diagram-3',
    descripcion: 'Áreas del establecimiento donde se trabaja.',
  },
  {
    area: 'sistema',
    ruta: '/personal',
    titulo: 'Personal',
    icono: 'bi-people',
    descripcion: 'Alta, modificación y permisos de las personas del establecimiento.',
  },
  {
    area: 'sistema',
    ruta: '/tipos-documento',
    titulo: 'Tipos de documento',
    icono: 'bi-files',
    descripcion: 'Clasificación de la documentación del personal.',
  },
  {
    area: 'sistema',
    ruta: '/tipos-incidente',
    titulo: 'Tipos de incidente',
    icono: 'bi-exclamation-triangle',
    descripcion: 'Categorías para registrar incidentes.',
  },
  {
    area: 'sistema',
    ruta: '/vista-publica/configuracion',
    titulo: 'Vista pública',
    icono: 'bi-globe',
    descripcion: 'Información e indicadores que se comparten.',
  },
];

export function ConfiguracionPage() {
  const [params, setParams] = useSearchParams();
  const { currentUser } = useAuth();
  const rotuladoActivo = useRotuladoFrontalActivo(currentUser?.administrar === true);
  const area = AREAS.find((item) => item.id === params.get('area')) ?? AREAS[0];

  return (
    <div className="configuracion-page">
      <header className="configuracion-titulo">
        <span className="configuracion-icono">
          <i className="bi bi-sliders" aria-hidden="true" />
        </span>
        <div>
          <span className="configuracion-antetitulo">Administración</span>
          <h1>Configuración</h1>
          <p>Catálogos y parámetros para organizar tu establecimiento.</p>
        </div>
      </header>
      <div className="configuracion-distribucion">
        <nav className="configuracion-areas" aria-label="Áreas de configuración">
          {AREAS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={area.id === item.id}
              onClick={() =>
                setParams((anterior) => {
                  const nuevo = new URLSearchParams(anterior);
                  nuevo.set('area', item.id);
                  return nuevo;
                })
              }
            >
              <i className={`bi ${item.icono}`} aria-hidden="true" />
              <span>{item.titulo}</span>
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          ))}
          <p className="configuracion-permisos">
            <i className="bi bi-lock" aria-hidden="true" />
            <span>Disponible para usuarios con permiso de administrar.</span>
          </p>
        </nav>
        <section className="configuracion-opciones" aria-labelledby="configuracion-area-titulo">
          <h2 id="configuracion-area-titulo">{area.titulo}</h2>
          <p className="configuracion-descripcion">{area.descripcion}</p>
          <div className="configuracion-tarjetas">
            {ACCESOS.filter(
              (item) =>
                item.area === area.id && (item.ruta !== '/parametros-normativos' || rotuladoActivo),
            ).map((item) => (
              <Link key={item.ruta} to={item.ruta} className="configuracion-tarjeta">
                <span className="configuracion-tarjeta-iconos">
                  <i className={`bi ${item.icono}`} aria-hidden="true" />
                  <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </span>
                <h3>{item.titulo}</h3>
                <p>{item.descripcion}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <footer className="configuracion-recordatorio">
        <i className="bi bi-layout-sidebar" aria-hidden="true" />
        <p>
          Los accesos de trabajo diario siguen en el menú lateral: productos, insumos, proveedores,
          recepciones y equipos.
        </p>
      </footer>
    </div>
  );
}

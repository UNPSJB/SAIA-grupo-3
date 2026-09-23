
import { PlanPage } from '../features/plan';
import { EquipoPage } from '../features/equipos';
import { PersonalPage } from '../features/personal';
import { InsumoPage } from '../features/insumos';
import { UnidadMedidaPage } from '../features/unidadMedida/unidadMedidaPage';
import { TareaPage } from '../features/tarea';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { SectorPage } from '../features/sectores/SectorPage';
//import { ProfesoresPage } from '../features/profesores';
import { ElementoPage } from '../features/elementos/ElementoPage';


export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
        <Route path="personal" element={<PersonalPage />} />
        <Route path="equipos" element={<EquipoPage/>} />
        <Route path="insumos" element={<InsumoPage />} />
        <Route path="unidades-medida" element={<UnidadMedidaPage />} />
        <Route path="tarea" element={<TareaPage />} />
        <Route path="sectores" element={<SectorPage/>} />
        <Route path="elementos" element={<ElementoPage />} />
          {/* Redirige por defecto a profesores */}
          {/* <Route index element={<Navigate to="/profesores" replace />} /> */}
         {/*  <Route path="profesores" element={<ProfesoresPage />} /> */}
          {/* Próximas rutas a conectar: */}
          {/* <Route path="estudiantes" element={<EstudiantesPage />} /> */}
          {/* <Route path="cursos" element={<CursosPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
import { PersonalPage } from '../features/personal';
import { InsumoPage } from '../features/insumos';
import { UnidadMedidaPage } from '../features/unidadMedida/unidadMedidaPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
//import { ProfesoresPage } from '../features/profesores';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
        <Route path="personal" element={<PersonalPage />} />
        <Route path="insumos" element={<InsumoPage />} />
        <Route path="unidades-medida" element={<UnidadMedidaPage />} />
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
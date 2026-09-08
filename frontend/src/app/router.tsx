import { PersonalPage } from '../features/personal';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
//import { ProfesoresPage } from '../features/profesores';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
        <Route path="personal" element={<PersonalPage />} />
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
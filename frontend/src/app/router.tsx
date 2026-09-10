import { EquipoPage } from '../features/equipos';
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
        <Route path="equipos" element={<EquipoPage/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
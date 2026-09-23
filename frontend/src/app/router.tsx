import { EquipoPage } from '../features/equipos';
import { PersonalPage } from '../features/personal';
import { InsumoPage } from '../features/insumos';
import { InsumoQuimicoPage } from '../features/insumosQuimicos';
import { UnidadMedidaPage } from '../features/unidadMedida/unidadMedidaPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { SectorPage } from '../features/sectores/SectorPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
        <Route path="personal" element={<PersonalPage />} />
        <Route path="equipos" element={<EquipoPage/>} />
        <Route path="insumos" element={<InsumoPage />} />
        <Route path="insumos-quimicos" element={<InsumoQuimicoPage />} />
        <Route path="unidades-medida" element={<UnidadMedidaPage />} />
        <Route path="sectores" element={<SectorPage/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
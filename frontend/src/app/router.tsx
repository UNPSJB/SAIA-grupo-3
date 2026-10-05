import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

// Importamos la seguridad
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';

// Importamos todas las páginas
import { PlanPage } from '../features/plan';
import { EquipoPage } from '../features/equipos';
import { PersonalPage } from '../features/personal';
import { InsumoPage } from '../features/insumos';
import { InsumoQuimicoPage } from '../features/insumosQuimicos';
import { UnidadMedidaPage } from '../features/unidadMedida/unidadMedidaPage';
import { TareaPage } from '../features/tarea';
import { SectorPage } from '../features/sectores/SectorPage';
import { ElementoPage } from '../features/elementos/ElementoPage';
import { ChecklistPage } from '../features/checklist';
import { AuditoriaPage } from '../features/auditoria';
import { ReporteConsumosPage } from '../features/consumoQuimicos/ConsumoQuimicoPage';

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/checklist" replace />} />

            {/* Operación diaria: requiere capacidad operar */}
            <Route element={<ProtectedRoute requireOperate />}>
              <Route path="checklist" element={<ChecklistPage />} />
            </Route>

            {/* Administración */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="personal" element={<PersonalPage />} />
              <Route path="equipos" element={<EquipoPage />} />
              <Route path="insumos" element={<InsumoPage />} />
              <Route path="insumos-quimicos" element={<InsumoQuimicoPage />} />
              <Route path="unidades-medida" element={<UnidadMedidaPage />} />
              <Route path="tarea" element={<TareaPage />} />
              <Route path="sectores" element={<SectorPage />} />
              <Route path="elementos" element={<ElementoPage />} />
              <Route path="planes" element={<PlanPage />} />
              <Route path="auditoria" element={<AuditoriaPage />} />

              <Route
                path="reportes/consumos"
                element={<ReporteConsumosPage />}
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
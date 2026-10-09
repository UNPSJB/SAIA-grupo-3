import { useAuth } from '../shared/hooks/useAuth';
import { homeFor } from '../shared/libreria/permissions';
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
import { TipoDocumentoPage } from '../features/tipoDocumento/TipoDocumentoPage';
import { TareaPage } from '../features/tarea';
import { SectorPage } from '../features/sectores/SectorPage';
import { ElementoPage } from '../features/elementos/ElementoPage';
import { ChecklistPage } from '../features/checklist';
import { AuditoriaPage } from '../features/auditoria';
import {
  ConsumoQuimicoPage,
  ReporteConsumosPage,
} from '../features/consumoQuimicos/ConsumoQuimicoPage';
import { VencimientosPage } from '../features/personal';
import { IncidentesPage } from '../features/incidentes';
import { CalibracionPage } from '../features/vencimientos/CalibracionPage';

function HomeRedirect() {
  const { currentUser } = useAuth();
  return <Navigate to={homeFor(currentUser)} replace />;
}

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
            <Route index element={<HomeRedirect />} />
            <Route
              path="sin-permisos"
              element={
                <div className="p-4" role="alert">
                  Tu usuario no tiene permisos asignados. Contactá a administración.
                </div>
              }
            />
            <Route path="*" element={<div className="p-4">Página no encontrada.</div>} />

            {/* Operación diaria: requiere capacidad operar */}
            <Route element={<ProtectedRoute requireOperate />}>
              <Route path="checklist" element={<ChecklistPage />} />
              <Route path="incidentes" element={<IncidentesPage />} />
              <Route path="incidentes/nuevo" element={<IncidentesPage />} />
              <Route path="incidentes/:id" element={<IncidentesPage />} />
              <Route path="incidentes/:id/:action" element={<IncidentesPage />} />
            </Route>

            {/* Administración */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="personal" element={<PersonalPage />} />
              <Route path="personal/nuevo" element={<PersonalPage />} />
              <Route path="personal/:id" element={<PersonalPage />} />
              <Route path="personal/:id/:action" element={<PersonalPage />} />
              <Route path="personal/vencimientos" element={<VencimientosPage />} />
              <Route path="vencimientos/calibracion" element={<CalibracionPage />} />
              <Route path="tipos-documento" element={<TipoDocumentoPage />} />
              <Route path="tipos-documento/nuevo" element={<TipoDocumentoPage />} />
              <Route path="tipos-documento/:id" element={<TipoDocumentoPage />} />
              <Route path="tipos-documento/:id/:action" element={<TipoDocumentoPage />} />
              <Route path="equipos" element={<EquipoPage />} />
              <Route path="equipos/nuevo" element={<EquipoPage />} />
              <Route path="equipos/:id" element={<EquipoPage />} />
              <Route path="equipos/:id/:action" element={<EquipoPage />} />
              <Route path="insumos" element={<InsumoPage />} />
              <Route path="insumos/nuevo" element={<InsumoPage />} />
              <Route path="insumos/:id" element={<InsumoPage />} />
              <Route path="insumos/:id/:action" element={<InsumoPage />} />
              <Route path="insumos-quimicos" element={<InsumoQuimicoPage />} />
              <Route path="insumos-quimicos/nuevo" element={<InsumoQuimicoPage />} />
              <Route path="insumos-quimicos/:id" element={<InsumoQuimicoPage />} />
              <Route path="insumos-quimicos/:id/:action" element={<InsumoQuimicoPage />} />
              <Route path="unidades-medida" element={<UnidadMedidaPage />} />
              <Route path="unidades-medida/nuevo" element={<UnidadMedidaPage />} />
              <Route path="unidades-medida/:id" element={<UnidadMedidaPage />} />
              <Route path="unidades-medida/:id/:action" element={<UnidadMedidaPage />} />
              <Route path="tarea" element={<TareaPage />} />
              <Route path="tarea/nuevo" element={<TareaPage />} />
              <Route path="tarea/:id" element={<TareaPage />} />
              <Route path="tarea/:id/:action" element={<TareaPage />} />
              <Route path="sectores" element={<SectorPage />} />
              <Route path="sectores/nuevo" element={<SectorPage />} />
              <Route path="sectores/:id" element={<SectorPage />} />
              <Route path="sectores/:id/:action" element={<SectorPage />} />
              <Route path="elementos" element={<ElementoPage />} />
              <Route path="elementos/nuevo" element={<ElementoPage />} />
              <Route path="elementos/:id" element={<ElementoPage />} />
              <Route path="elementos/:id/:action" element={<ElementoPage />} />
              <Route path="planes" element={<PlanPage />} />
              <Route path="planes/nuevo" element={<PlanPage />} />
              <Route path="planes/:id" element={<PlanPage />} />
              <Route path="planes/:id/:action" element={<PlanPage />} />
              <Route path="auditoria" element={<AuditoriaPage />} />
              <Route path="auditoria/:id" element={<AuditoriaPage />} />

              <Route path="consumos" element={<ConsumoQuimicoPage />} />
              <Route path="consumos/nuevo" element={<ConsumoQuimicoPage />} />
              <Route path="consumos/:id" element={<ConsumoQuimicoPage />} />
              <Route path="consumos/:id/:action" element={<ConsumoQuimicoPage />} />
              <Route path="reportes/consumos" element={<ReporteConsumosPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

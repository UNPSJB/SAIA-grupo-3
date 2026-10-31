import { useAuth } from '../shared/hooks/useAuth';
import { homeFor } from '../shared/libreria/permissions';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

// Importamos la seguridad
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';

// Importamos todas las páginas
import { InicioAdminPage } from '../features/inicio/InicioAdminPage';
import { PlanPage } from '../features/plan';
import { EquipoPage } from '../features/equipos';
import { PersonalPage } from '../features/personal';
import { InsumoPage } from '../features/insumos';
import { ProductoPage } from '../features/productos';
import { LoteProduccionPage } from '../features/lotesProduccion';
import { InsumoQuimicoPage } from '../features/insumosQuimicos';
import { UnidadMedidaPage } from '../features/unidadMedida/unidadMedidaPage';
import { TipoDocumentoPage } from '../features/tipoDocumento/TipoDocumentoPage';
import { TipoIncidentePage } from '../features/tipoIncidente/TipoIncidentePage';
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
import { DocumentoTecnicoPage } from '../features/documentosTecnicos';
import { DocumentosVigentesPage } from '../features/documentosTecnicos/DocumentosVigentesPage';
import { IncidentePage, IncidentesAbiertosPage } from '../features/incidentes';
import { VencimientosCalibracionPage } from '../features/equipos';
import { VencimientosPage as VencimientosConsolidadosPage } from '../features/vencimientos';
import { TableroPage } from '../features/tablero';
import { HistorialLotesPage } from '../features/lotesProduccion';
import { ConfiguracionVistaPublicaPage } from '../features/vistaPublica/ConfiguracionVistaPublicaPage';
import { VistaPublicaPage } from '../features/vistaPublica/VistaPublicaPage';
import { PerfilPage } from '../features/perfil';


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
          <Route path="/saia-publica" element={<VistaPublicaPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeRedirect />} />
            <Route path="perfil" element={<PerfilPage />} />
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
              <Route path="documentos-vigentes" element={<DocumentosVigentesPage />} />
              <Route path="incidentes/nuevo" element={<IncidentePage />} />
              <Route path="lotes-produccion/nuevo" element={<LoteProduccionPage />} />
            </Route>

            {/* Consulta compartida (Operador o Administrador) */}
            <Route element={<ProtectedRoute requireAdminOrOperate />}>
              <Route path="incidentes" element={<IncidentePage />} />
              <Route path="incidentes/:id" element={<IncidentePage />} />
              <Route path="lotes-produccion" element={<LoteProduccionPage />} />
              <Route path="lotes-produccion/:id" element={<LoteProduccionPage />} />
            </Route>

            {/* Administración */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="inicio" element={<InicioAdminPage />} />
              <Route path="vista-publica/configuracion" element={<ConfiguracionVistaPublicaPage />}/>
              <Route path="vencimientos" element={<VencimientosConsolidadosPage />} />
              <Route path="incidentes/abiertos" element={<IncidentesAbiertosPage />} />
              <Route path="incidentes/:id/:action" element={<IncidentePage />} />

              <Route path="personal" element={<PersonalPage />} />
              <Route path="personal/nuevo" element={<PersonalPage />} />
              <Route path="personal/:id" element={<PersonalPage />} />
              <Route path="personal/:id/:action" element={<PersonalPage />} />
              <Route path="personal/vencimientos" element={<VencimientosPage />} />
           
              <Route path="vencimientos/calibracion" element={<VencimientosCalibracionPage />} />
              <Route path="vencimientos/calibracion/:id" element={<VencimientosCalibracionPage />} />
              <Route path="vencimientos/calibracion/:id/:action" element={<VencimientosCalibracionPage />} />
           
              <Route path="tipos-documento" element={<TipoDocumentoPage />} />
              <Route path="tipos-documento/nuevo" element={<TipoDocumentoPage />} />
              <Route path="tipos-documento/:id" element={<TipoDocumentoPage />} />
              <Route path="tipos-documento/:id/:action" element={<TipoDocumentoPage />} />
              <Route path="tipos-incidente" element={<TipoIncidentePage />} />
              <Route path="tipos-incidente/nuevo" element={<TipoIncidentePage />} />
              <Route path="tipos-incidente/:id" element={<TipoIncidentePage />} />
              <Route path="tipos-incidente/:id/:action" element={<TipoIncidentePage />} />
              <Route path="equipos" element={<EquipoPage />} />
              <Route path="equipos/nuevo" element={<EquipoPage />} />
              <Route path="equipos/:id" element={<EquipoPage />} />
              <Route path="equipos/:id/:action" element={<EquipoPage />} />
              <Route path="productos" element={<ProductoPage />} />
              <Route path="productos/nuevo" element={<ProductoPage />} />
              <Route path="productos/:id" element={<ProductoPage />} />
              <Route path="productos/:id/:action" element={<ProductoPage />} />
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
              <Route path="tablero" element={<TableroPage />} />
              <Route path="lotes" element={<HistorialLotesPage />} />
              <Route path="lotes/:id" element={<HistorialLotesPage />} />
              <Route path="consumos" element={<ConsumoQuimicoPage />} />
              <Route path="consumos/nuevo" element={<ConsumoQuimicoPage />} />
              <Route path="consumos/:id" element={<ConsumoQuimicoPage />} />
              <Route path="consumos/:id/:action" element={<ConsumoQuimicoPage />} />
              <Route path="reportes/consumos" element={<ReporteConsumosPage />} />
              <Route path="documentos-tecnicos" element={<DocumentoTecnicoPage />} />
              <Route path="documentos-tecnicos/nuevo" element={<DocumentoTecnicoPage />} />
              <Route path="documentos-tecnicos/:id" element={<DocumentoTecnicoPage />} />
              <Route path="documentos-tecnicos/:id/:action" element={<DocumentoTecnicoPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

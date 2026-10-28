import { useState } from 'react';
import { Button, Container, Nav } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { EquipoForm } from '../equipos/EquipoForm';
import { EquipoView } from '../equipos/EquipoView';
import { getEquipoById, updateEquipo } from '../equipos/equipoApi';
import { VencimientosCalibracionList } from '../equipos/VencimientosCalibracionList';
import type { Equipo, VencimientoCalibracion } from '../equipos/types';
import { PersonalForm } from '../personal/PersonalForm';
import { getPersonalById, updatePersonal } from '../personal/personalApi';
import { PersonalView } from '../personal/PersonalView';
import { VencimientosList as VencimientosPersonalList } from '../personal/VencimientosList';
import type {
  Personal,
  PersonalUpdateInput,
  Vencimiento,
} from '../personal/types';
import { useVencimientos } from './useVencimientos';
import { VencimientosList } from './VencimientosList';
import type { OrigenVencimiento } from './types';

export function VencimientosPage() {
  const [, setSearchParams] = useSearchParams();
  const [origen, setOrigen] = useState<OrigenVencimiento>('todos');
  const vencimientos = useVencimientos('todos', origen === 'todos');

  const cambiarOrigen = (valor: string | null) => {
    if (
      valor === 'todos' ||
      valor === 'documentacion' ||
      valor === 'calibracion'
    ) {
      if (valor === origen) return;
      setSearchParams(
        (anteriores) => {
          const nuevos = new URLSearchParams(anteriores);
          [
            'page',
            'buscar',
            'ordenar_por',
            'orden',
            'estado',
            'solo_alertas',
            'mostrar_inactivos',
          ].forEach((parametro) => nuevos.delete(parametro));
          return nuevos;
        },
        { replace: true },
      );
      vencimientos.reiniciarFiltros();
      setOrigen(valor);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h2 className="mb-1">Vencimientos próximos</h2>
          <p className="text-muted mb-0">
            Vencimientos de documentación del personal y calibración de equipos.
          </p>
        </div>
      </div>

      <Nav
        variant="tabs"
        activeKey={origen}
        onSelect={cambiarOrigen}
        className="mb-3"
      >
        <Nav.Item>
          <Nav.Link eventKey="todos">Todos</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="documentacion">Personal</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="calibracion">Calibración</Nav.Link>
        </Nav.Item>
      </Nav>

      {origen === 'todos' && (
        <VencimientosList
          items={vencimientos.items}
          page={vencimientos.page}
          totalPages={vencimientos.totalPages}
          total={vencimientos.total}
          loading={vencimientos.loading}
          error={vencimientos.error}
          changePage={vencimientos.changePage}
          busqueda={vencimientos.busqueda}
          setBusqueda={vencimientos.setBusqueda}
          estado={vencimientos.estado}
          setEstado={vencimientos.setEstado}
          soloAlertas={vencimientos.soloAlertas}
          setSoloAlertas={vencimientos.setSoloAlertas}
          limpiarFiltros={vencimientos.limpiarFiltros}
          ordenarPor={vencimientos.ordenarPor}
          orden={vencimientos.orden}
          cambiarOrden={vencimientos.cambiarOrden}
          onActualizar={vencimientos.refrescar}
        />
      )}
      {origen === 'documentacion' && <PestanaPersonal />}
      {origen === 'calibracion' && <PestanaCalibracion />}
    </Container>
  );
}

function PestanaPersonal() {
  const [modo, setModo] = useState<'listado' | 'ver' | 'editar'>('listado');
  const [personalSeleccionado, setPersonalSeleccionado] =
    useState<Personal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerLegajo = async (vencimiento: Vencimiento) => {
    setCargando(true);
    setError(null);
    try {
      const personal = await getPersonalById(vencimiento.personal.id);
      setPersonalSeleccionado(personal);
      setModo('ver');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo abrir el legajo.',
      );
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (datos: PersonalUpdateInput) => {
    if (!personalSeleccionado) return;
    await updatePersonal(personalSeleccionado.id, datos);
    const actualizado = await getPersonalById(personalSeleccionado.id);
    setPersonalSeleccionado(actualizado);
    setModo('ver');
  };

  const volverAlListado = () => {
    setModo('listado');
    setPersonalSeleccionado(null);
    setError(null);
  };

  return (
    <>
      {error && <ErrorAlert mensaje={error} />}
      {cargando && <LoadingSpinner mensaje="Abriendo legajo..." />}
      {modo === 'listado' && (
        <VencimientosPersonalList onVerLegajo={handleVerLegajo} />
      )}
      {modo === 'ver' && personalSeleccionado && (
        <PersonalView
          personal={personalSeleccionado}
          onEditar={() => setModo('editar')}
          onVolver={volverAlListado}
        />
      )}
      {modo === 'editar' && personalSeleccionado && (
        <PersonalForm
          personalInicial={personalSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => setModo('ver')}
        />
      )}
    </>
  );
}

function PestanaCalibracion() {
  const [modo, setModo] = useState<'listado' | 'ver' | 'editar'>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerEquipo = async (vencimiento: VencimientoCalibracion) => {
    setCargando(true);
    setError(null);
    try {
      const equipo = await getEquipoById(vencimiento.equipo.id);
      setEquipoSeleccionado(equipo);
      setModo('ver');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo abrir el equipo.',
      );
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (datos: Equipo) => {
    if (!equipoSeleccionado?.id) return;
    await updateEquipo(equipoSeleccionado.id, datos);
    const actualizado = await getEquipoById(equipoSeleccionado.id);
    setEquipoSeleccionado(actualizado);
    setModo('ver');
  };

  const volverAlListado = () => {
    setModo('listado');
    setEquipoSeleccionado(null);
    setError(null);
  };

  const handleCalibracionesActualizadas = async () => {
    if (!equipoSeleccionado?.id) return;
    try {
      const actualizado = await getEquipoById(equipoSeleccionado.id);
      setEquipoSeleccionado(actualizado);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el detalle del equipo.',
      );
    }
  };

  return (
    <>
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          {modo !== 'listado' && (
            <Button
              variant="secondary"
              onClick={volverAlListado}
              className="mb-3"
            >
              Volver al listado
            </Button>
          )}
        </>
      )}
      {cargando && <LoadingSpinner mensaje="Cargando equipo..." />}
      {modo === 'listado' && (
        <VencimientosCalibracionList onVerEquipo={handleVerEquipo} />
      )}
      {modo === 'ver' && equipoSeleccionado && (
        <EquipoView
          equipo={equipoSeleccionado}
          onEditar={() => setModo('editar')}
          onVolver={volverAlListado}
          onCalibracionesActualizadas={handleCalibracionesActualizadas}
        />
      )}
      {modo === 'editar' && equipoSeleccionado && (
        <EquipoForm
          equipoInicial={equipoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => setModo('ver')}
        />
      )}
    </>
  );
}

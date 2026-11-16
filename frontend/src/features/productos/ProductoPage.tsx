import { Button, Container, Tab, Tabs } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuth } from '../../shared/hooks/useAuth';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { AplicabilidadProducto } from '../rotuladoFrontal/AplicabilidadProducto';
import { useRotuladoFrontalActivo } from '../rotuladoFrontal/useRotuladoFrontalActivo';
import { ProductoDeleteView } from './ProductoDeleteView';
import { ProductoForm } from './ProductoForm';
import { ProductoList } from './ProductoList';
import { ProductoView } from './ProductoView';
import { getProductoById } from './productoApi';
import type { Producto, ProductoCreate } from './types';
import { useProducto } from './useProducto';

export function ProductoPage() {
  const route = useCrudRoute<Producto>('/productos', getProductoById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useProducto(false);
  const { currentUser } = useAuth();
  const rotuladoActivo = useRotuladoFrontalActivo(currentUser?.administrar === true);

  const handleGuardar = async (datos: ProductoCreate) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };

  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Productos</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <ProductoList
          onNuevoClick={() => open()}
          onViewClick={(producto) => open(producto)}
          onEditarClick={(producto) => open(producto, 'editar')}
          onEliminarClick={(producto) => open(producto, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && !rotuladoActivo && (
        <ProductoView producto={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {mode === 'ver' && item && rotuladoActivo && (
        <Tabs defaultActiveKey="datos" id="producto-pestanas" className="mb-3" mountOnEnter>
          <Tab eventKey="datos" title="Datos">
            <ProductoView producto={item} onEditar={() => open(item, 'editar')} onVolver={back} />
          </Tab>
          <Tab eventKey="rotulado" title="Rotulado frontal">
            <AplicabilidadProducto key={item.id} productoId={item.id} />
          </Tab>
        </Tabs>
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <ProductoForm
          key={item?.id ?? 'nuevo'}
          productoInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && (
        <ProductoDeleteView
          producto={item}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={back}
        />
      )}
    </Container>
  );
}

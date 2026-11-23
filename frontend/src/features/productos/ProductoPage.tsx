import { useState } from 'react';
import { Button, Container, Tab, Tabs } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuth } from '../../shared/hooks/useAuth';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { AplicabilidadProducto } from '../rotuladoFrontal/AplicabilidadProducto';
import { SellosProducto } from '../rotuladoFrontal/SellosProducto';
import { useRotuladoFrontalActivo } from '../rotuladoFrontal/useRotuladoFrontalActivo';
import { ProductoDeleteView } from './ProductoDeleteView';
import { ProductoForm } from './ProductoForm';
import { ProductoList } from './ProductoList';
import { ProductoRecetaTab } from './ProductoRecetaTab';
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
  const [pestana, setPestana] = useState<{ id: number; clave: string } | null>(null);
  const pestanaActiva = item && pestana?.id === item.id ? pestana.clave : 'datos';
  const irA = (clave: string) => item && setPestana({ id: item.id, clave });

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
      {mode === 'ver' && item && (
        <Tabs
          activeKey={pestanaActiva}
          onSelect={(clave) => irA(clave ?? 'datos')}
          id="producto-pestanas"
          className="mb-3"
          mountOnEnter
        >
          <Tab eventKey="datos" title="Datos">
            <ProductoView producto={item} onEditar={() => open(item, 'editar')} onVolver={back} />
          </Tab>
          <Tab eventKey="receta" title="Receta">
            <ProductoRecetaTab key={item.id} producto={item} onVolver={back} />
          </Tab>
          {rotuladoActivo && (
            <Tab eventKey="rotulado" title="Rotulado frontal">
              <AplicabilidadProducto
                key={item.id}
                productoId={item.id}
                onIrASellos={() => irA('sellos')}
              />
            </Tab>
          )}
          {rotuladoActivo && (
            <Tab eventKey="sellos" title="Sellos">
              <SellosProducto
                key={`${item.id}-${pestanaActiva}`}
                productoId={item.id}
                onIrAAplicabilidad={() => irA('rotulado')}
              />
            </Tab>
          )}
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
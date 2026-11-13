import { CatalogPage } from '../../shared/components/CatalogPage';
import { API_BASE_URL, fetchWithAuth } from '../../shared/libreria/api';
const fields = { tipo: 'Tipo', sufijo: 'Sufijo', factor_base: 'Factor a la unidad base' };
const optionalFields = {
  factor_base:
    'Opcional. Cuántas unidades base equivalen a 1 de esta unidad: peso en g (kg = 1000), capacidad en ml (L = 1000), unidad en un (docena = 12). Se usa para calcular la composición de las recetas.',
};
const options = { tipo: ['peso', 'longitud', 'capacidad', 'unidad'] };
async function load(id: number) {
  const response = await fetchWithAuth(`${API_BASE_URL}/unidades-medida/${id}`);
  if (!response.ok) throw new Error('No se encontró el registro.');
  return response.json();
}
export function UnidadMedidaPage() {
  return (
    <CatalogPage
      title="Unidades de Medida"
      endpoint="unidades-medida"
      fields={fields}
      options={options}
      optionalFields={optionalFields}
      load={load}
    />
  );
}

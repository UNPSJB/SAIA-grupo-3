import { CatalogPage } from '../../shared/components/CatalogPage';
import { API_BASE_URL, fetchWithAuth } from '../../shared/libreria/api';
const fields = { tipo: 'Tipo', sufijo: 'Sufijo' };
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
      load={load}
    />
  );
}

import { CatalogPage } from '../../shared/components/CatalogPage';
import { API_BASE_URL, fetchWithAuth } from '../../shared/libreria/api';
const fields = { nombre: 'Nombre', color: 'Color' };
const options = { color: ['primary', 'secondary', 'success', 'danger', 'warning', 'info'] };
const colorField = { value: 'color', label: 'nombre' };
async function load(id: number) {
  const response = await fetchWithAuth(`${API_BASE_URL}/tipos-incidente/${id}`);
  if (!response.ok) throw new Error('No se encontró el registro.');
  return response.json();
}
export function TipoIncidentePage() {
  return (
    <CatalogPage
      title="Tipos de Incidente"
      endpoint="tipos-incidente"
      fields={fields}
      options={options}
      colorField={colorField}
      load={load}
    />
  );
}

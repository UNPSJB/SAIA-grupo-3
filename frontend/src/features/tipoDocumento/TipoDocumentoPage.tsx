import { CatalogPage } from '../../shared/components/CatalogPage';
import { API_BASE_URL, fetchWithAuth } from '../../shared/libreria/api';
const fields = { nombre: 'Nombre' };
async function load(id: number) {
  const response = await fetchWithAuth(`${API_BASE_URL}/tipos-documento/${id}`);
  if (!response.ok) throw new Error('No se encontró el registro.');
  return response.json();
}
export function TipoDocumentoPage() {
  return (
    <CatalogPage
      title="Tipos de Documento"
      endpoint="tipos-documento"
      fields={fields}
      load={load}
    />
  );
}

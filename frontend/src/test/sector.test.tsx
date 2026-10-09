import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectorForm } from '../features/sectores/SectorForm';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PersonalPage } from '../features/personal/PersonalPage';
import { SectorPage } from '../features/sectores/SectorPage';
import { usePagedList } from '../shared/hooks/usePagedList';
import { permissions, homeFor } from '../shared/libreria/permissions';
import type { AuthUser } from '../features/auth/types';
const response = (data: object) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
function Location() {
  const location = useLocation();
  return (
    <output aria-label="url">
      {location.pathname}
      {location.search}
    </output>
  );
}
describe('Sectores', () => {
  it('valida espacios, conserva los datos ante un error y permite reintentar', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('Nombre duplicado'))
      .mockResolvedValue(undefined);
    render(<SectorForm onGuardar={save} onCancelar={() => {}} />);
    const input = screen.getByPlaceholderText('Ej. Mantenimiento');
    await userEvent.type(input, '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(save).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeTruthy();
    await userEvent.clear(input);
    await userEvent.type(input, ' Cocina ');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Nombre duplicado')).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe(' Cocina ');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(save).toHaveBeenLastCalledWith({ nombre: 'Cocina' });
  });
  it('bloquea envíos mientras guarda y precarga la edición', async () => {
    let finish!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <SectorForm
        sectorInicial={{ id: 3, nombre: 'Cocina', activo: true }}
        onGuardar={save}
        onCancelar={() => {}}
      />,
    );
    await waitFor(() =>
      expect((screen.getByPlaceholderText('Ej. Mantenimiento') as HTMLInputElement).value).toBe(
        'Cocina',
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(
      (screen.getByRole('button', { name: 'Guardando...' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    finish();
    await screen.findByRole('button', { name: 'Actualizar' });
  });
  it('carga un detalle desde URL y conserva filtros al volver', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        response(
          url.includes('/sectores/3')
            ? { id: 3, nombre: 'Cocina', activo: true, equipos: [] }
            : { items: [], total: 20, pages: 2 },
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/sectores/3?buscar=Cocina&page=2']}>
        <Location />
        <Routes>
          <Route path="/sectores" element={<SectorPage />} />
          <Route path="/sectores/:id" element={<SectorPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Detalle del Sector')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByLabelText('url').textContent).toBe('/sectores?buscar=Cocina&page=2');
  });
  it('muestra un error recuperable para identificadores inválidos', async () => {
    render(
      <MemoryRouter initialEntries={['/sectores/no-numero']}>
        <Routes>
          <Route path="/sectores/:id" element={<SectorPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Identificador inválido/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver al listado' })).toBeTruthy();
  });
});
function ListHarness() {
  const list = usePagedList<{ nombre: string }>('sectores');
  const navigate = useNavigate();
  return (
    <>
      <Location />
      <input
        aria-label="buscar"
        value={list.busqueda}
        onChange={(e) => list.setBusqueda(e.target.value)}
      />
      <button onClick={() => navigate('/?buscar=segundo')}>Segundo</button>
      <output aria-label="resultado">{list.items.map((item) => item.nombre).join(',')}</output>
    </>
  );
}
describe('Listados y permisos', () => {
  it('reinicia la página al buscar y espera 300 ms', async () => {
    const fetcher = vi.fn(async (url: string) => {
      void url;
      return response({ items: [], total: 50, pages: 5 });
    });
    vi.stubGlobal('fetch', fetcher);
    render(
      <MemoryRouter initialEntries={['/?page=4']}>
        <ListHarness />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('buscar'), { target: { value: 'cocina' } });
    expect(screen.getByLabelText('url').textContent).toContain('page=1');
    expect(fetcher).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(String(fetcher.mock.calls[1][0])).toContain('buscar=cocina');
  });
  it('descarta respuestas de búsquedas anteriores', async () => {
    let first!: (value: Response) => void;
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            first = resolve;
          }),
      )
      .mockResolvedValue(response({ items: [{ nombre: 'Segundo' }], total: 1, pages: 1 }));
    vi.stubGlobal('fetch', fetcher);
    render(
      <MemoryRouter>
        <ListHarness />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Segundo' }));
    await waitFor(() => expect(screen.getByLabelText('resultado').textContent).toBe('Segundo'));
    first(response({ items: [{ nombre: 'Primero' }], total: 1, pages: 1 }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByLabelText('resultado').textContent).toBe('Segundo');
  });
  it.each([
    [false, false, '/sin-permisos'],
    [true, false, '/personal'],
    [false, true, '/checklist'],
    [true, true, '/checklist'],
  ])('elige el inicio por capacidades %s/%s', (administrar, operar, home) => {
    const user = { administrar, operar } as AuthUser;
    expect(homeFor(user)).toBe(home);
    expect(permissions(user)).toEqual({ canAdmin: administrar, canOperate: operar });
  });
});


it('el listado de personal usa su contrato paginado y conserva el filtro de vencimientos', async () => {
  const fetcher = vi.fn(async (url: string) => {
    expect(url).toContain('/personal?');
    expect(url).toContain('proximos_a_vencer=true');
    return response({ items: [{ id: 1, nombre: 'Ana', apellido: 'Prueba', dni: '123', nroLegajo: '1', email: 'ana@example.com', username: 'ana', operar: true, administrar: false, activo: true }], total: 1, pages: 1 });
  });
  vi.stubGlobal('fetch', fetcher);
  render(<MemoryRouter initialEntries={['/personal?vencimiento=proximos']}><PersonalPage /></MemoryRouter>);
  expect(await screen.findByText(/Prueba, Ana/)).toBeTruthy();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
function Back() { const navigate = useNavigate(); return <button onClick={() => navigate(-1)}>Atrás del navegador</button>; }
it('Atrás vuelve del detalle al listado con los filtros originales', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => response(url.includes('/sectores/3') ? { id: 3, nombre: 'Cocina', activo: true, equipos: [] } : { items: [{ id: 3, nombre: 'Cocina', activo: true }], total: 20, pages: 2 })));
  render(<MemoryRouter initialEntries={['/sectores?buscar=Cocina&page=2']}><Location /><Back /><Routes><Route path="/sectores" element={<SectorPage />} /><Route path="/sectores/:id" element={<SectorPage />} /></Routes></MemoryRouter>);
  await userEvent.click(await screen.findByTitle('Ver'));
  expect(await screen.findByText('Detalle del Sector')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Atrás del navegador' }));
  expect(screen.getByLabelText('url').textContent).toBe('/sectores?buscar=Cocina&page=2');
  expect(await screen.findByText('Nómina de Sectores')).toBeTruthy();
});

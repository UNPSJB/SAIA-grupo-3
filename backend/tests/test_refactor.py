import pytest
from src.main import app
from src.auth.dependencies import get_current_personal
from src.sector.models import Sector
from src.equipos.models import Equipo


def test_sector_search_before_pagination_and_stable_order(admin, db):
    db.add_all([Sector(nombre=f"Sector {i:02}", activo=True) for i in range(15)] + [Sector(nombre="Cocina A", activo=True), Sector(nombre="Cocina B", activo=True), Sector(nombre="Cocina baja", activo=False), Sector(nombre="100%", activo=True)])
    db.commit()
    response = admin.get('/sectores/', params={"buscar": "cocina", "size": 1, "ordenar_por": "nombre"})
    assert response.status_code == 200
    data = response.json(); assert data['total'] == 2 and data['pages'] == 2
    second = admin.get('/sectores/', params={"buscar": "cocina", "size": 1, "page": 2, "ordenar_por": "nombre"}).json()
    assert data['items'][0]['id'] < second['items'][0]['id']
    assert admin.get('/sectores/', params={"buscar": "cocina", "mostrar_inactivos": True}).json()['total'] == 3
    assert admin.get('/sectores/', params={"buscar": "%"}).json()['total'] == 1
    assert admin.get('/sectores/', params={"buscar": "no existe"}).json()['total'] == 0

@pytest.mark.parametrize('params', [{"ordenar_por": "equipos"}, {"orden": "invalid"}, {"page": 0}, {"size": 101}])
def test_invalid_list_params(admin, params):
    assert admin.get('/sectores/', params=params).status_code == 422

@pytest.mark.parametrize('administrar,operar', [(False, False), (True, False), (False, True), (True, True)])
def test_permission_matrix(client, user, administrar, operar):
    user.administrar = administrar; user.operar = operar
    app.dependency_overrides[get_current_personal] = lambda: user
    assert client.get('/sectores/').status_code == (200 if administrar else 403)
    assert client.post('/sectores/', json={"nombre": "Nuevo"}).status_code == (200 if administrar else 403)
    assert client.get('/personal/').status_code == (200 if administrar else 403)
    assert client.get(f'/personal/{user.id}').status_code == 200
    assert client.get('/incidentes/').status_code == (200 if administrar or operar else 403)


def test_unauthenticated_access(client):
    assert client.get('/sectores/').status_code == 401


def test_sector_create_edit_duplicate_deactivate_reactivate(admin):
    created = admin.post('/sectores/', json={"nombre": "Cocina"}); assert created.status_code == 200
    identifier = created.json()['id']
    assert admin.post('/sectores/', json={"nombre": "Cocina"}).status_code in (400, 409)
    assert admin.put(f'/sectores/{identifier}', json={"nombre": "Producción"}).status_code == 200
    assert admin.delete(f'/sectores/{identifier}').status_code == 200
    assert admin.get('/sectores/').json()['total'] == 0
    assert admin.put(f'/sectores/{identifier}', json={"activo": True}).status_code == 200
    assert admin.get('/sectores/').json()['total'] == 1


def test_sector_with_equipment_cannot_be_deleted(admin, db):
    sector = Sector(nombre="Con equipo", activo=True); db.add(sector); db.flush()
    db.add(Equipo(nombre="Balanza", numero_serie="SN-1", tipo="instrumento", sector_id=sector.id, activo=True)); db.commit()
    assert admin.delete(f'/sectores/{sector.id}').status_code in (400, 409)
    assert admin.get('/sectores/').json()['total'] == 1


def test_login_refresh_logout_and_inactive_user(client, db, user):
    login = client.post('/auth/token', data={"username": "ana", "password": "clave123"})
    assert login.status_code == 200
    assert 'HttpOnly' in login.headers['set-cookie']
    token = login.json()['access_token']
    assert client.get(f'/personal/{user.id}', headers={"Authorization": f"Bearer {token}"}).status_code == 200
    assert client.put('/auth/token').status_code == 200
    assert client.delete('/auth/token').status_code == 200
    assert client.put('/auth/token').status_code == 401
    user.activo = False; db.commit()
    assert client.get(f'/personal/{user.id}', headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert client.post('/auth/token', data={"username": "ana", "password": "clave123"}).status_code == 400


@pytest.mark.parametrize('endpoint', ['sectores', 'equipos', 'elementos', 'insumos', 'insumos-quimicos', 'personal', 'planes', 'tareas', 'unidades-medida', 'tipos-documento', 'incidentes', 'consumo-quimico', 'planes-realizados', 'documentacion/vencimientos'])
def test_all_lists_accept_search_sort_and_pagination(admin, endpoint):
    response = admin.get(f'/{endpoint}/', params={'buscar': 'prueba', 'page': 1, 'size': 5})
    assert response.status_code == 200, response.text
    assert set(response.json()) == {'items', 'total', 'page', 'size', 'pages'}


def test_report_accepts_search_sort_and_rejects_invalid_order(admin):
    assert admin.get('/consumo-quimico/reporte/acumulado', params={'buscar': 'producto', 'ordenar_por': 'cantidad_total', 'orden': 'desc'}).status_code == 200
    assert admin.get('/consumo-quimico/reporte/acumulado', params={'ordenar_por': 'invalid'}).status_code == 422


@pytest.mark.parametrize('column', ['id', 'fecha', 'insumo_quimico_id', 'tarea_limpieza', 'cantidad_utilizada', 'activo'])
def test_consumption_columns_exposed_by_frontend(admin, column):
    assert admin.get('/consumo-quimico/', params={'ordenar_por': column, 'orden': 'desc'}).status_code == 200

from tests.database import (
    client,
    db_session,
    headers_administradora,
    persona_administradora,
    unidad_medida,
)


def test_endpoint_crear_insumo_sin_cantidad(
    client,
    headers_administradora,
    unidad_medida,
):
    respuesta = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={
            "nombre": "Harina",
            "unidad_medida_id": unidad_medida.id,
        },
    )

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["cantidad"] == 0


def test_endpoint_rechaza_cantidad_en_catalogo(
    client,
    headers_administradora,
    unidad_medida,
):
    respuesta = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={
            "nombre": "Harina",
            "unidad_medida_id": unidad_medida.id,
            "cantidad": 50,
        },
    )

    assert respuesta.status_code == 422

import pytest


def test_crud_busqueda_orden_y_bajas(client, admin_headers, unidad_medida):
    datos = dict(nombre='Insumo de prueba', unidad_medida_id=unidad_medida.id)
    respuesta = client.post('/insumos/', json=datos, headers=admin_headers)
    assert respuesta.status_code == 200, respuesta.text
    id_ = respuesta.json()['id']
    assert client.get(f'/insumos/{id_}', headers=admin_headers).json()['nombre'] == datos['nombre']
    respuesta = client.put(f'/insumos/{id_}', json={'nombre': 'Registro cambiado'}, headers=admin_headers)
    assert respuesta.status_code == 200
    lista = client.get('/insumos/', params={'buscar': 'Registro cambiado', 'ordenar_por': 'nombre', 'orden': 'desc'}, headers=admin_headers)
    assert lista.status_code == 200 and lista.json()['total'] == 1
    assert client.delete(f'/insumos/{id_}', headers=admin_headers).json()['activo'] is False
    assert client.get('/insumos/', params={'buscar': 'Registro cambiado'}, headers=admin_headers).json()['total'] == 0
    assert client.get('/insumos/', params={'buscar': 'Registro cambiado', 'mostrar_inactivos': True}, headers=admin_headers).json()['total'] == 1
    assert client.put(f'/insumos/{id_}', json={'activo': True}, headers=admin_headers).json()['activo'] is True

@pytest.mark.parametrize('ruta', ['/insumos/', '/insumos/999999'])
def test_maestro_requiere_autenticacion(client, ruta):
    assert client.get(ruta).status_code == 401


def test_maestro_requiere_administracion(client, headers_sin_permisos):
    assert client.get('/insumos/', headers=headers_sin_permisos).status_code == 403


def test_id_inexistente(client, admin_headers):
    assert client.get('/insumos/999999', headers=admin_headers).status_code == 404


def test_orden_paginacion_y_busqueda_con_varios_registros(client, admin_headers, unidad_medida):
    for nombre in ['Prueba Zebra', 'Prueba Alfa', 'Prueba Medio']:
        datos={'unidad_medida_id':unidad_medida.id}
        datos['nombre']=nombre
        respuesta=client.post('/insumos/',json=datos,headers=admin_headers)
        assert respuesta.status_code==200,respuesta.text
    parametros={'buscar':'Prueba','ordenar_por':'nombre','orden':'asc','size':2,'page':1}
    r=client.get('/insumos/',params=parametros,headers=admin_headers)
    assert r.status_code==200
    assert [i['nombre'] for i in r.json()['items']]==['Prueba Alfa','Prueba Medio']
    assert r.json()['total']==3 and r.json()['pages']==2
    parametros.update(orden='desc',page=2)
    assert [i['nombre'] for i in client.get('/insumos/',params=parametros,headers=admin_headers).json()['items']]==['Prueba Alfa']


def test_duplicado_http(client, admin_headers, unidad_medida):
    datos={'unidad_medida_id':unidad_medida.id}
    datos['nombre']='Duplicado'
    assert client.post('/insumos/',json=datos,headers=admin_headers).status_code==200
    assert client.post('/insumos/',json=datos,headers=admin_headers).status_code==400

@pytest.mark.parametrize('inactiva',[False,True])
def test_http_no_admite_unidad_inexistente_o_inactiva(client, db_session, admin_headers, unidad_medida, inactiva):
    datos={'unidad_medida_id':unidad_medida.id}
    datos['nombre']='No debe crearse'
    if inactiva:
        unidad_medida.activo=False;db_session.commit()
    else:datos['unidad_medida_id']=999999
    respuesta=client.post('/insumos/',json=datos,headers=admin_headers)
    assert respuesta.status_code==404,respuesta.text

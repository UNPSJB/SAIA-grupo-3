
import pytest


def test_crud_busqueda_orden_y_bajas(client, admin_headers, unidad_medida):
    datos = dict(tipo='peso', sufijo='TEST')
    respuesta = client.post('/unidades-medida/', json=datos, headers=admin_headers)
    assert respuesta.status_code == 200, respuesta.text
    id_ = respuesta.json()['id']
    assert client.get(f'/unidades-medida/{id_}', headers=admin_headers).json()['sufijo'] == datos['sufijo']
    respuesta = client.put(f'/unidades-medida/{id_}', json={'sufijo': 'Registro cambiado'}, headers=admin_headers)
    assert respuesta.status_code == 200
    lista = client.get('/unidades-medida/', params={'buscar': 'Registro cambiado', 'ordenar_por': 'sufijo', 'orden': 'desc'}, headers=admin_headers)
    assert lista.status_code == 200 and lista.json()['total'] == 1
    assert client.delete(f'/unidades-medida/{id_}', headers=admin_headers).json()['activo'] is False
    assert client.get('/unidades-medida/', params={'buscar': 'Registro cambiado'}, headers=admin_headers).json()['total'] == 0
    assert client.get('/unidades-medida/', params={'buscar': 'Registro cambiado', 'mostrar_inactivos': True}, headers=admin_headers).json()['total'] == 1
    assert client.put(f'/unidades-medida/{id_}', json={'activo': True}, headers=admin_headers).json()['activo'] is True

@pytest.mark.parametrize('ruta', ['/unidades-medida/', '/unidades-medida/999999'])
def test_maestro_requiere_autenticacion(client, ruta):
    assert client.get(ruta).status_code == 401


def test_maestro_requiere_administracion(client, headers_sin_permisos):
    assert client.get('/unidades-medida/', headers=headers_sin_permisos).status_code == 403


def test_id_inexistente(client, admin_headers):
    assert client.get('/unidades-medida/999999', headers=admin_headers).status_code == 404


def test_orden_paginacion_y_busqueda_con_varios_registros(client, admin_headers, unidad_medida):
    for nombre in ['Prueba Zebra', 'Prueba Alfa', 'Prueba Medio']:
        datos={'tipo':'peso'}
        datos['sufijo']=nombre
        respuesta=client.post('/unidades-medida/',json=datos,headers=admin_headers)
        assert respuesta.status_code==200,respuesta.text
    parametros={'buscar':'Prueba','ordenar_por':'sufijo','orden':'asc','size':2,'page':1}
    r=client.get('/unidades-medida/',params=parametros,headers=admin_headers)
    assert r.status_code==200
    assert [i['sufijo'] for i in r.json()['items']]==['Prueba Alfa','Prueba Medio']
    assert r.json()['total']==3 and r.json()['pages']==2
    parametros.update(orden='desc',page=2)
    assert [i['sufijo'] for i in client.get('/unidades-medida/',params=parametros,headers=admin_headers).json()['items']]==['Prueba Alfa']


def test_duplicado_http(client, admin_headers, unidad_medida):
    datos={'tipo':'peso'}
    datos['sufijo']='Duplicado'
    assert client.post('/unidades-medida/',json=datos,headers=admin_headers).status_code==200
    assert client.post('/unidades-medida/',json=datos,headers=admin_headers).status_code==400


def test_http_rechaza_tipo_invalido(client,admin_headers):
    assert client.post('/unidades-medida/',json={'tipo':'invalido','sufijo':'X'},headers=admin_headers).status_code==422

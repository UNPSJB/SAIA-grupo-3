import pytest


def test_ciclo_publico_sin_login_y_sin_datos_personales(client, admin_headers, persona_administradora):
    assert client.get('/publico/saia-publica').status_code == 404
    respuesta = client.post('/vista-publica/activar', headers=admin_headers)
    assert respuesta.status_code == 200 and respuesta.json()['enlace']
    publica = client.get('/publico/saia-publica')
    assert publica.status_code == 200
    assert set(publica.json()) == {'establecimiento', 'fecha_actualizacion', 'indicadores'}
    for dato in [persona_administradora.email, persona_administradora.dni, persona_administradora.hashed_password]:
        assert dato not in publica.text
    assert publica.headers['cache-control'] == 'no-store'
    assert client.post('/vista-publica/desactivar', headers=admin_headers).status_code == 200
    assert client.get('/publico/saia-publica').status_code == 404


@pytest.mark.parametrize('metodo,ruta,datos', [
    ('get','/vista-publica/configuracion', None),
    ('post','/vista-publica/activar',None),
    ('post','/vista-publica/desactivar',None),
    ('patch','/vista-publica/indicadores',{'codigo':'cumplimiento','habilitado':False}),
    ('get','/vista-publica/previsualizacion',None),
])
def test_administracion_restringida(client, headers_operadora, metodo, ruta, datos):
    assert client.request(metodo, ruta, json=datos).status_code == 401
    assert client.request(metodo, ruta, json=datos, headers=headers_operadora).status_code == 403


def test_configuracion_inmediata_e_indicador_invalido(client, admin_headers):
    client.post('/vista-publica/activar', headers=admin_headers)
    datos = {'codigo':'cumplimiento','habilitado':False}
    assert client.patch('/vista-publica/indicadores', json=datos, headers=admin_headers).status_code == 200
    assert client.get('/publico/saia-publica').json()['indicadores'] == []
    assert client.patch('/vista-publica/indicadores', json={'codigo':'incidentes','habilitado':True}, headers=admin_headers).status_code == 422

import pytest

@pytest.mark.parametrize('minima,maxima', [(8,2),(2,2),(None,8),(2,None)])
def test_rechaza_rango_invalido(client, admin_headers, equipo_frio, minima, maxima):
    datos = {'nombre':'Equipo inválido','numero_serie':'INVALIDO','tipo':'equipo','sector_id':equipo_frio.sector_id,'controla_temperatura':True,'temperatura_minima':minima,'temperatura_maxima':maxima}
    assert client.post('/equipos/', json=datos, headers=admin_headers).status_code == 422


def test_configurar_control_y_validar_edicion_parcial(client, admin_headers, equipo_frio):
    respuesta = client.put(f'/equipos/{equipo_frio.id}', json={'temperatura_minima':3}, headers=admin_headers)
    assert respuesta.status_code == 200 and respuesta.json()['temperatura_minima'] == 3
    assert client.put(f'/equipos/{equipo_frio.id}', json={'temperatura_minima':20}, headers=admin_headers).status_code == 422
    assert client.get(f'/equipos/{equipo_frio.id}', headers=admin_headers).json()['temperatura_minima'] == 3

import pytest
from datetime import date

@pytest.mark.parametrize('ruta', ['/tablero/cumplimiento-checklist', '/tablero/produccion'])
def test_tablero_solo_administradores(client, admin_headers, headers_operadora, ruta):
    assert client.get(ruta).status_code == 401
    assert client.get(ruta, headers=headers_operadora).status_code == 403
    respuesta = client.get(ruta, headers=admin_headers)
    assert respuesta.status_code == 200

@pytest.mark.parametrize('ruta', ['/tablero/cumplimiento-checklist', '/tablero/produccion'])
def test_tablero_valida_fechas(client, admin_headers, ruta):
    assert client.get(ruta, params={'fecha_desde':'no-fecha'}, headers=admin_headers).status_code == 422
    respuesta = client.get(ruta, params={'fecha_desde':'2026-01-02','fecha_hasta':'2026-01-01'}, headers=admin_headers)
    assert respuesta.status_code == 400


def test_agrupacion_y_filtro_producto(client, admin_headers):
    assert client.get('/tablero/cumplimiento-checklist', params={'agrupacion':'invalida'}, headers=admin_headers).status_code == 422
    assert client.get('/tablero/produccion', params={'producto_id':999999}, headers=admin_headers).status_code == 404


def test_endpoint_devuelve_totales_reales_de_produccion(client,db_session,admin_headers,producto,persona_operadora):
    from src.loteProduccion.models import LoteProduccion
    hoy=date.today()
    db_session.add(LoteProduccion(codigo='TABLERO-HTTP',producto_id=producto.id,fecha_produccion=hoy,cantidad=17,registrado_por_id=persona_operadora.id,activo=True))
    db_session.commit()
    r=client.get('/tablero/produccion',params={'producto_id':producto.id,'fecha_desde':hoy.isoformat(),'fecha_hasta':hoy.isoformat()},headers=admin_headers)
    assert r.status_code==200
    assert r.json()['series'][0]['total']==17
    assert r.json()['series'][0]['producto']['id']==producto.id

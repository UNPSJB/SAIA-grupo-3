import pytest
from sqlalchemy import func, select

from src.abastecimiento.models import LoteRecepcionInsumo, Proveedor


def test_endpoint_crear_proveedor(client, auth_headers, datos_proveedor):
    respuesta = client.post('/proveedores/', json=datos_proveedor, headers=auth_headers)
    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos['id'] is not None
    assert datos['cuit'] == '30123456789'
    for campo in ('nombre', 'telefono', 'email', 'numero_habilitacion', 'vencimiento_habilitacion'):
        assert datos[campo] == datos_proveedor[campo]
    assert datos['activo'] is True


def test_endpoint_leer_proveedor(client, auth_headers, proveedor):
    respuesta = client.get(f"/proveedores/{proveedor['id']}", headers=auth_headers)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['id'] == proveedor['id']
    assert respuesta.json()['nombre'] == proveedor['nombre']


def test_endpoint_listar_proveedores(client, auth_headers, proveedor):
    respuesta = client.get('/proveedores/', headers=auth_headers)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['total'] == 1
    assert respuesta.json()['items'][0]['id'] == proveedor['id']


def test_endpoint_modificar_proveedor(client, auth_headers, proveedor, datos_proveedor):
    respuesta = client.put(
        f"/proveedores/{proveedor['id']}",
        json={**datos_proveedor, 'nombre': 'Molino actualizado'}, headers=auth_headers,
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['id'] == proveedor['id']
    assert respuesta.json()['nombre'] == 'Molino actualizado'


def test_endpoint_baja_y_reactivacion_proveedor(client, db_session, auth_headers, proveedor):
    baja = client.delete(f"/proveedores/{proveedor['id']}", headers=auth_headers)
    assert baja.status_code == 200, baja.text
    assert baja.json()['activo'] is False
    assert db_session.get(Proveedor, proveedor['id']) is not None
    listado = client.get('/proveedores/', headers=auth_headers)
    assert listado.status_code == 200
    assert listado.json()['total'] == 0
    reactivado = client.patch(
        f"/proveedores/{proveedor['id']}/estado", json={'activo': True}, headers=auth_headers,
    )
    assert reactivado.status_code == 200, reactivado.text
    assert reactivado.json()['activo'] is True
    listado = client.get('/proveedores/', headers=auth_headers)
    assert listado.status_code == 200
    assert listado.json()['total'] == 1


@pytest.mark.parametrize('inactivo', [False, True])
def test_endpoint_rechazar_cuit_duplicado(client, auth_headers, proveedor, datos_proveedor, inactivo):
    if inactivo:
        baja = client.delete(f"/proveedores/{proveedor['id']}", headers=auth_headers)
        assert baja.status_code == 200
    respuesta = client.post(
        '/proveedores/',
        json={**datos_proveedor, 'nombre': 'Proveedor duplicado', 'cuit': proveedor['cuit']},
        headers=auth_headers,
    )
    assert respuesta.status_code == 409


def test_endpoint_registrar_lote_aumenta_stock_y_guarda_actor(
    client, db_session, auth_headers, datos_lote, insumo_activo, persona_operadora
):
    stock_anterior = insumo_activo.cantidad
    respuesta = client.post('/lotes-insumo/', json=datos_lote, headers=auth_headers)
    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    for campo in ('numero_lote', 'insumo_id', 'proveedor_id', 'fecha_recepcion', 'fecha_vencimiento', 'cantidad'):
        assert datos[campo] == datos_lote[campo]
    assert datos['cantidad_disponible'] == datos_lote['cantidad']
    assert datos['registrado_por_id'] == persona_operadora.id
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == pytest.approx(stock_anterior + datos_lote['cantidad'])


def test_endpoint_no_recibir_de_proveedor_inactivo(
    client, db_session, auth_headers, proveedor, datos_lote, insumo_activo
):
    stock_anterior = insumo_activo.cantidad
    baja = client.delete(f"/proveedores/{proveedor['id']}", headers=auth_headers)
    assert baja.status_code == 200
    respuesta = client.post('/lotes-insumo/', json=datos_lote, headers=auth_headers)
    assert respuesta.status_code == 409
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == stock_anterior
    assert db_session.scalar(select(func.count()).select_from(LoteRecepcionInsumo)) == 0


def test_endpoint_leer_lote(client, auth_headers, lote):
    respuesta = client.get(f"/lotes-insumo/{lote['id']}", headers=auth_headers)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['id'] == lote['id']
    assert respuesta.json()['numero_lote'] == lote['numero_lote']


def test_endpoint_listar_lotes_con_filtros(client, auth_headers, lote):
    respuesta = client.get(
        '/lotes-insumo/',
        params={
            'insumo_id': lote['insumo_id'], 'proveedor_id': lote['proveedor_id'],
            'fecha_desde': lote['fecha_recepcion'].isoformat(),
            'fecha_hasta': lote['fecha_recepcion'].isoformat(),
        }, headers=auth_headers,
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['total'] == 1
    assert respuesta.json()['items'][0]['id'] == lote['id']
    sin_resultados = client.get(
        '/lotes-insumo/', params={'proveedor_id': lote['proveedor_id'] + 1}, headers=auth_headers,
    )
    assert sin_resultados.status_code == 200
    assert sin_resultados.json()['total'] == 0


def test_endpoint_modificar_lote_ajusta_stock(
    client, db_session, auth_headers, lote, datos_lote, insumo_activo
):
    stock_anterior = insumo_activo.cantidad
    respuesta = client.put(
        f"/lotes-insumo/{lote['id']}", json={**datos_lote, 'cantidad': 15}, headers=auth_headers,
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['cantidad'] == 15
    assert respuesta.json()['cantidad_disponible'] == 15
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == pytest.approx(stock_anterior + 5)


def test_endpoint_anular_lote_revierte_stock(client, db_session, auth_headers, lote, insumo_activo):
    stock_anterior = insumo_activo.cantidad
    respuesta = client.delete(f"/lotes-insumo/{lote['id']}", headers=auth_headers)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['activo'] is False
    assert db_session.get(LoteRecepcionInsumo, lote['id']) is not None
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == pytest.approx(stock_anterior - lote['cantidad'])


@pytest.mark.parametrize('ruta', ['/proveedores/999', '/lotes-insumo/999'])
def test_endpoint_registro_inexistente(client, auth_headers, ruta):
    assert client.get(ruta, headers=auth_headers).status_code == 404


@pytest.mark.parametrize('ruta', ['/proveedores/', '/lotes-insumo/'])
def test_endpoint_requiere_autenticacion(client, ruta):
    assert client.get(ruta).status_code == 401


@pytest.mark.parametrize('ruta', ['/proveedores/', '/lotes-insumo/'])
def test_endpoint_requiere_permiso_administrar(client, headers_operadora, ruta):
    assert client.get(ruta, headers=headers_operadora).status_code == 403


@pytest.mark.parametrize('recurso', ['proveedor', 'lote'])
def test_endpoint_no_crear_sin_permiso_administrar(
    client, db_session, headers_operadora, datos_proveedor, datos_lote, recurso
):
    ruta, payload, modelo = {
        'proveedor': ('/proveedores/', datos_proveedor, Proveedor),
        'lote': ('/lotes-insumo/', datos_lote, LoteRecepcionInsumo),
    }[recurso]
    cantidad_anterior = db_session.scalar(select(func.count()).select_from(modelo))
    respuesta = client.post(ruta, json=payload, headers=headers_operadora)
    assert respuesta.status_code == 403
    assert db_session.scalar(select(func.count()).select_from(modelo)) == cantidad_anterior


@pytest.mark.parametrize('cantidad', [0, -1])
def test_endpoint_rechazar_cantidad_invalida(
    client, db_session, auth_headers, datos_lote, insumo_activo, cantidad
):
    stock_anterior = insumo_activo.cantidad
    respuesta = client.post(
        '/lotes-insumo/', json={**datos_lote, 'cantidad': cantidad}, headers=auth_headers,
    )
    assert respuesta.status_code == 422
    db_session.refresh(insumo_activo)
    assert insumo_activo.cantidad == stock_anterior
    assert db_session.scalar(select(func.count()).select_from(LoteRecepcionInsumo)) == 0

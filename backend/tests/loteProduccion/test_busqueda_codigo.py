from datetime import date

import pytest

from src.loteProduccion import schemas, services


@pytest.fixture
def lote_operadora(db_session, producto, persona_operadora):
    return services.crear_lote(
        db_session,
        schemas.LoteProduccionCreate(producto_id=producto.id, fecha_produccion=date.today(), cantidad=10),
        persona_operadora.id,
    )


@pytest.fixture
def lote_administradora(db_session, producto, persona_administradora, lote_operadora):
    return services.crear_lote(
        db_session,
        schemas.LoteProduccionCreate(producto_id=producto.id, fecha_produccion=date.today(), cantidad=20),
        persona_administradora.id,
    )


def buscar(client, headers, codigo):
    return client.get("/lotes-produccion/buscar", params={"codigo": codigo}, headers=headers)


def test_busca_un_lote_por_codigo_de_barras(client, headers_administradora, lote_operadora):
    respuesta = buscar(client, headers_administradora, lote_operadora.codigo_barras)

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == lote_operadora.id
    assert respuesta.json()["codigo_barras"] == lote_operadora.codigo_barras


def test_busca_un_lote_por_codigo_de_lote_sin_importar_espacios_ni_mayusculas(
    client, headers_administradora, lote_operadora
):
    respuesta = buscar(client, headers_administradora, f"  {lote_operadora.codigo.lower()} ")

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == lote_operadora.id


@pytest.mark.parametrize("codigo", ["12345", "20261122000a3", "abc"])
def test_informa_un_formato_invalido(client, headers_administradora, codigo):
    respuesta = buscar(client, headers_administradora, codigo)

    assert respuesta.status_code == 400
    assert "13 dígitos" in respuesta.json()["detail"]


def test_informa_un_prefijo_invalido(client, headers_administradora):
    respuesta = buscar(client, headers_administradora, "3017620422003")

    assert respuesta.status_code == 400
    assert "debe empezar con 20" in respuesta.json()["detail"]


def test_informa_el_digito_verificador_leido_y_esperado(client, headers_administradora):
    respuesta = buscar(client, headers_administradora, "2026112200018")

    assert respuesta.status_code == 400
    assert "se leyó 8 y se esperaba 3" in respuesta.json()["detail"]


@pytest.mark.parametrize("codigo", ["2026112200020", "L-20261122-999"])
def test_informa_que_no_hay_lote_con_un_codigo_valido_inexistente(client, headers_administradora, codigo):
    respuesta = buscar(client, headers_administradora, codigo)

    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == f"No hay ningún lote con el código {codigo}."


def test_un_operario_encuentra_sus_lotes(client, headers_operadora, lote_operadora):
    respuesta = buscar(client, headers_operadora, lote_operadora.codigo_barras)

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == lote_operadora.id


def test_un_operario_no_encuentra_lotes_de_otra_persona(client, headers_operadora, lote_administradora):
    respuesta = buscar(client, headers_operadora, lote_administradora.codigo_barras)

    assert respuesta.status_code == 404
    assert "No hay ningún lote" in respuesta.json()["detail"]


def test_sin_permisos_no_se_puede_buscar(client, headers_sin_permisos, lote_operadora):
    respuesta = buscar(client, headers_sin_permisos, lote_operadora.codigo_barras)

    assert respuesta.status_code == 403


def test_el_codigo_es_obligatorio(client, headers_administradora):
    respuesta = client.get("/lotes-produccion/buscar", headers=headers_administradora)

    assert respuesta.status_code == 422

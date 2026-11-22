import pytest

from src.loteProduccion.constants import ErrorCode
from src.rotulo.services import ultimo_lote
from tests.produccionDelDia.conftest import (
    conservante,
    crear_lote,
    datos_receta,
    insumo_aditivo,
    receta,
    sorbato,
)

MOTIVO = "Se detectó un insumo fuera de especificación"


def anular(client, headers, lote_id, motivo=MOTIVO):
    return client.post(f"/lotes-produccion/{lote_id}/anular", headers=headers, json={"motivo": motivo})


def iniciar_produccion(client, headers, lote_id):
    paso = client.get(f"/produccion-del-dia/lotes/{lote_id}/pasos", headers=headers).json()[0]
    respuesta = client.post(f"/produccion-del-dia/pasos/{paso['id']}/realizar", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return paso


@pytest.fixture
def lote_anulado(client, headers_administradora, crear_lote):
    respuesta = anular(client, headers_administradora, crear_lote()["id"])
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def test_anular_un_lote_registra_motivo_fecha_y_responsable(
    client, headers_administradora, persona_administradora, crear_lote
):
    lote = crear_lote()

    respuesta = anular(client, headers_administradora, lote["id"], motivo=f"  {MOTIVO} ")

    assert respuesta.status_code == 200, respuesta.text
    anulado = respuesta.json()
    assert anulado["estado"] == "anulado"
    assert anulado["motivo_anulacion"] == MOTIVO
    assert anulado["fecha_anulacion"] is not None
    assert anulado["anulado_por"]["id"] == persona_administradora.id
    assert anulado["activo"] is True


def test_se_puede_anular_un_lote_en_produccion_o_cerrado(
    client, headers_operadora, headers_administradora, crear_lote
):
    en_produccion = crear_lote()
    iniciar_produccion(client, headers_operadora, en_produccion["id"])
    cerrado = crear_lote(con_receta=False)
    client.post(f"/lotes-produccion/{cerrado['id']}/cerrar", headers=headers_administradora)

    desde_produccion = anular(client, headers_administradora, en_produccion["id"])
    desde_cerrado = anular(client, headers_administradora, cerrado["id"])

    assert desde_produccion.json()["estado"] == "anulado"
    assert desde_cerrado.json()["estado"] == "anulado"
    assert desde_cerrado.json()["fecha_cierre"] is not None


def test_solo_un_administrador_puede_anular(client, headers_operadora, crear_lote):
    lote = crear_lote()

    assert anular(client, headers_operadora, lote["id"]).status_code == 403


@pytest.mark.parametrize("cuerpo", [{}, {"motivo": ""}, {"motivo": "   "}])
def test_la_anulacion_exige_un_motivo(client, headers_administradora, crear_lote, cuerpo):
    lote = crear_lote()

    respuesta = client.post(f"/lotes-produccion/{lote['id']}/anular", headers=headers_administradora, json=cuerpo)

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.MOTIVO_ANULACION_OBLIGATORIO
    assert client.get(f"/lotes-produccion/{lote['id']}", headers=headers_administradora).json()["estado"] == "abierto"


@pytest.mark.parametrize(
    "metodo, ruta, cuerpo",
    [
        ("put", "", {"cantidad": 20}),
        ("put", "", {"activo": True}),
        ("put", "", {"activo": False}),
        ("delete", "", None),
        ("post", "/cerrar", None),
        ("post", "/anular", {"motivo": "Otra vez"}),
    ],
)
def test_un_lote_anulado_no_se_puede_modificar_ni_reactivar(
    client, headers_administradora, lote_anulado, metodo, ruta, cuerpo
):
    respuesta = client.request(
        metodo, f"/lotes-produccion/{lote_anulado['id']}{ruta}", headers=headers_administradora, json=cuerpo
    )

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.LOTE_ANULADO


def test_un_lote_anulado_no_permite_marcar_pasos_ni_aparece_en_produccion_del_dia(
    client, headers_operadora, lote_anulado
):
    paso = client.get(f"/produccion-del-dia/lotes/{lote_anulado['id']}/pasos", headers=headers_operadora).json()[0]

    respuesta = client.post(f"/produccion-del-dia/pasos/{paso['id']}/realizar", headers=headers_operadora)

    assert respuesta.status_code == 400
    assert client.get("/produccion-del-dia", headers=headers_operadora).json() == []


def test_un_lote_dado_de_baja_no_se_puede_anular(client, headers_administradora, crear_lote):
    lote = crear_lote()
    client.delete(f"/lotes-produccion/{lote['id']}", headers=headers_administradora)

    respuesta = anular(client, headers_administradora, lote["id"])

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.LOTE_DADO_DE_BAJA


def test_anular_no_devuelve_el_stock_y_conserva_la_trazabilidad(
    client, db_session, headers_administradora, lote_recepcion, crear_lote
):
    lote = crear_lote()
    db_session.refresh(lote_recepcion)
    disponible_antes = lote_recepcion.cantidad_disponible

    anular(client, headers_administradora, lote["id"])

    db_session.refresh(lote_recepcion)
    assert lote_recepcion.cantidad_disponible == disponible_antes
    hacia_atras = client.get(f"/lotes-produccion/{lote['id']}/trazabilidad", headers=headers_administradora)
    assert hacia_atras.status_code == 200
    assert hacia_atras.json()["insumos"][0]["cantidad_usada"] == 1
    hacia_adelante = client.get(f"/lotes-insumo/{lote_recepcion.id}/trazabilidad", headers=headers_administradora)
    assert [(uso["lote_produccion_id"], uso["estado"]) for uso in hacia_adelante.json()] == [(lote["id"], "anulado")]


@pytest.fixture
def lotes_por_estado(client, headers_operadora, crear_lote, lote_anulado):
    abierto = crear_lote()
    en_produccion = crear_lote()
    iniciar_produccion(client, headers_operadora, en_produccion["id"])
    return {"abierto": abierto["id"], "en_produccion": en_produccion["id"], "anulado": lote_anulado["id"]}


def listar(client, headers, **params):
    respuesta = client.get("/lotes-produccion/", headers=headers, params=params)
    assert respuesta.status_code == 200, respuesta.text
    return {lote["id"] for lote in respuesta.json()["items"]}


def test_el_listado_oculta_los_anulados_por_defecto(client, headers_administradora, lotes_por_estado):
    assert listar(client, headers_administradora) == {lotes_por_estado["abierto"], lotes_por_estado["en_produccion"]}


@pytest.mark.parametrize(
    "params, esperados",
    [
        ({"estado": "anulado"}, ["anulado"]),
        ({"estado": "en_produccion"}, ["en_produccion"]),
        ({"estado": "abierto"}, ["abierto"]),
        ({"incluir_anulados": True}, ["abierto", "en_produccion", "anulado"]),
    ],
)
def test_el_listado_filtra_por_estado(client, headers_administradora, lotes_por_estado, params, esperados):
    assert listar(client, headers_administradora, **params) == {lotes_por_estado[estado] for estado in esperados}


def test_filtrar_por_un_estado_inexistente_devuelve_422(client, headers_administradora):
    respuesta = client.get("/lotes-produccion/", headers=headers_administradora, params={"estado": "perdido"})

    assert respuesta.status_code == 422


def test_las_estadisticas_de_produccion_excluyen_los_lotes_anulados(
    client, headers_administradora, crear_lote, lote_anulado
):
    crear_lote()

    estadistica = client.get("/tablero/produccion", headers=headers_administradora).json()

    assert [serie["total"] for serie in estadistica["series"]] == [10]


def test_el_rotulo_no_toma_un_lote_anulado_como_ultimo_lote(client, db_session, headers_administradora, crear_lote):
    valido = crear_lote()
    anulado = crear_lote()
    anular(client, headers_administradora, anulado["id"])

    assert ultimo_lote(db_session, valido["producto_id"]).id == valido["id"]

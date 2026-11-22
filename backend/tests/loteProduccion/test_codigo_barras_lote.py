from datetime import date, timedelta

from src.loteProduccion import schemas, services
from src.loteProduccion.codigo_barras import generar_codigo_barras, validar_codigo_barras


def registrar(db_session, producto, persona_operadora):
    return services.crear_lote(
        db_session,
        schemas.LoteProduccionCreate(producto_id=producto.id, fecha_produccion=date.today(), cantidad=10),
        persona_operadora.id,
    )


def test_al_registrar_un_lote_se_genera_su_codigo_de_barras(db_session, producto, persona_operadora):
    lote = registrar(db_session, producto, persona_operadora)

    assert lote.codigo_barras == generar_codigo_barras(date.today(), 1)
    assert validar_codigo_barras(lote.codigo_barras) == lote.codigo_barras


def test_el_codigo_de_barras_usa_el_mismo_numero_que_el_codigo_del_lote(db_session, producto, persona_operadora):
    registrar(db_session, producto, persona_operadora)
    segundo = registrar(db_session, producto, persona_operadora)

    assert segundo.codigo.endswith("-002")
    assert segundo.codigo_barras == generar_codigo_barras(date.today(), 2)


def test_el_codigo_de_barras_no_cambia_al_editar_el_lote(db_session, producto, persona_operadora):
    lote = registrar(db_session, producto, persona_operadora)
    original = lote.codigo_barras

    services.modificar_lote(
        db_session,
        lote.id,
        schemas.LoteProduccionUpdate(fecha_produccion=date.today() - timedelta(days=1), cantidad=25),
    )

    assert lote.codigo_barras == original


def test_el_codigo_de_barras_no_se_puede_modificar_por_la_api(
    client, headers_administradora, db_session, producto, persona_operadora
):
    lote = registrar(db_session, producto, persona_operadora)

    respuesta = client.put(
        f"/lotes-produccion/{lote.id}",
        json={"codigo_barras": "2099999999999", "cantidad": 30},
        headers=headers_administradora,
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["codigo_barras"] == lote.codigo_barras
    assert respuesta.json()["cantidad"] == 30

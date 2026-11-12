import pytest

from src.producto.models import Producto
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida


@pytest.fixture
def receta(client, headers_administradora, datos_receta):
    respuesta = client.post("/recetas/", headers=headers_administradora, json=datos_receta())
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def escalar(client, headers, receta, **params):
    return client.get(f"/recetas/{receta['id']}/escalado", headers=headers, params=params)


def por_insumo(escalado):
    return {renglon["insumo"]["nombre"]: renglon for renglon in escalado["renglones"]}


def test_factor_2_duplica_todas_las_cantidades(client, headers_operadora, receta):
    respuesta = escalar(client, headers_operadora, receta, factor=2)

    assert respuesta.status_code == 200, respuesta.text
    escalado = respuesta.json()
    assert escalado["factor"] == 2
    assert escalado["rendimiento_escalado"] == 20
    assert [(r["cantidad_receta"], r["cantidad_escalada"]) for r in escalado["renglones"]] == [
        (8, 16),
        (2, 4),
        (0.01, 0.02),
    ]
    assert all(r["unidad_medida"]["sufijo"] == "kg" for r in escalado["renglones"])


def test_cantidad_objetivo_calcula_el_factor_segun_el_rendimiento(client, headers_operadora, receta):
    escalado = escalar(client, headers_operadora, receta, cantidad_objetivo=25).json()

    assert escalado["factor"] == 2.5
    assert escalado["rendimiento_escalado"] == 25
    assert escalado["cantidad_lote"] == 25
    assert por_insumo(escalado)["Harina"]["cantidad_escalada"] == 20


@pytest.mark.parametrize("params", [{"factor": 0}, {"factor": -1}, {"cantidad_objetivo": 0}, {"cantidad_objetivo": -5}])
def test_factor_o_cantidad_cero_o_negativa_da_error(client, headers_operadora, receta, params):
    assert escalar(client, headers_operadora, receta, **params).status_code == 422


@pytest.mark.parametrize("params", [{}, {"factor": 2, "cantidad_objetivo": 10}])
def test_hay_que_indicar_una_sola_forma_de_escalar(client, headers_operadora, receta, params):
    respuesta = escalar(client, headers_operadora, receta, **params)

    assert respuesta.status_code == 400
    assert "no los dos" in respuesta.json()["detail"]


def test_escalar_no_modifica_la_receta_guardada(client, headers_administradora, headers_operadora, receta):
    antes = client.get(f"/recetas/{receta['id']}", headers=headers_administradora).json()

    escalar(client, headers_operadora, receta, factor=3)

    despues = client.get(f"/recetas/{receta['id']}", headers=headers_administradora).json()
    assert despues == antes


def test_informa_el_stock_y_avisa_si_no_alcanza(client, headers_operadora, receta, lote_recepcion):
    alcanza = por_insumo(escalar(client, headers_operadora, receta, factor=1).json())
    no_alcanza = escalar(client, headers_operadora, receta, factor=2).json()

    assert alcanza["Harina"]["stock_disponible"] == 12
    assert alcanza["Harina"]["stock_suficiente"] is True
    assert por_insumo(no_alcanza)["Harina"]["stock_suficiente"] is False
    assert no_alcanza["hay_faltantes"] is True


def test_convierte_a_la_unidad_del_insumo_para_comparar_stock(
    client, db_session, headers_administradora, headers_operadora, datos_receta, lote_recepcion
):
    gramos = UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="g", activo=True, factor_base=1)
    db_session.add(gramos)
    db_session.commit()
    datos = datos_receta()
    datos["renglones"][0].update(cantidad=500, unidad_medida_id=gramos.id)
    receta = client.post("/recetas/", headers=headers_administradora, json=datos).json()

    harina = por_insumo(escalar(client, headers_operadora, receta, factor=2).json())["Harina"]

    assert (harina["cantidad_escalada"], harina["unidad_medida"]["sufijo"]) == (1000, "g")
    assert (harina["cantidad_en_unidad_stock"], harina["unidad_stock"]["sufijo"]) == (1, "kg")
    assert harina["stock_suficiente"] is True


def test_un_usuario_sin_permisos_no_puede_escalar(client, headers_sin_permisos, receta):
    assert escalar(client, headers_sin_permisos, receta, factor=2).status_code == 403


def _lote_desde_receta(receta, escalado, lote_recepcion, **cambios):
    harina = por_insumo(escalado)["Harina"]
    datos = {
        "producto_id": receta["producto"]["id"],
        "fecha_produccion": lote_recepcion.fecha_recepcion.isoformat(),
        "cantidad": escalado["cantidad_lote"],
        "insumos": [
            {
                "insumo_id": harina["insumo"]["id"],
                "cantidad_usada": harina["cantidad_en_unidad_stock"],
                "lotes_recepcion": [{"lote_recepcion_id": lote_recepcion.id, "cantidad": harina["cantidad_en_unidad_stock"]}],
            }
        ],
        "version_receta_id": escalado["version_id"],
        "factor_receta": escalado["factor"],
    }
    datos.update(cambios)
    return datos


def test_un_lote_creado_desde_la_receta_guarda_version_y_factor(
    client, headers_operadora, receta, lote_recepcion
):
    escalado = escalar(client, headers_operadora, receta, factor=1.25).json()

    respuesta = client.post("/lotes-produccion/", headers=headers_operadora, json=_lote_desde_receta(receta, escalado, lote_recepcion))

    assert respuesta.status_code == 200, respuesta.text
    lote = respuesta.json()
    assert lote["version_receta"] == {"id": receta["version_vigente"]["id"], "receta_id": receta["id"], "numero": 1}
    assert lote["factor_receta"] == 1.25
    assert lote["insumos_asociados"][0]["cantidad_usada"] == 10


def test_un_lote_sin_receta_sigue_funcionando(client, headers_operadora, receta, lote_recepcion):
    escalado = escalar(client, headers_operadora, receta, factor=1).json()
    datos = _lote_desde_receta(receta, escalado, lote_recepcion)
    del datos["version_receta_id"], datos["factor_receta"]

    respuesta = client.post("/lotes-produccion/", headers=headers_operadora, json=datos)

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["version_receta"] is None


def test_version_sin_factor_es_invalida(client, headers_operadora, receta, lote_recepcion):
    escalado = escalar(client, headers_operadora, receta, factor=1).json()
    datos = _lote_desde_receta(receta, escalado, lote_recepcion)
    del datos["factor_receta"]

    assert client.post("/lotes-produccion/", headers=headers_operadora, json=datos).status_code == 422


def test_no_se_puede_usar_la_receta_de_otro_producto(
    client, db_session, headers_operadora, receta, lote_recepcion, unidad_medida
):
    otro = Producto(nombre="Otro producto", unidad_medida_id=unidad_medida.id, activo=True)
    db_session.add(otro)
    db_session.commit()
    escalado = escalar(client, headers_operadora, receta, factor=1).json()

    respuesta = client.post(
        "/lotes-produccion/",
        headers=headers_operadora,
        json=_lote_desde_receta(receta, escalado, lote_recepcion, producto_id=otro.id),
    )

    assert respuesta.status_code == 400
    assert "otro producto" in respuesta.json()["detail"]


def test_si_la_receta_cambio_hay_que_volver_a_escalar(
    client, headers_administradora, headers_operadora, receta, datos_receta, lote_recepcion
):
    escalado = escalar(client, headers_operadora, receta, factor=1).json()
    nueva = {**datos_receta(), "version_base_id": receta["version_vigente"]["id"], "motivo": "Cambio"}
    nueva.pop("producto_id")
    client.post(f"/recetas/{receta['id']}/versiones", headers=headers_administradora, json=nueva)

    respuesta = client.post("/lotes-produccion/", headers=headers_operadora, json=_lote_desde_receta(receta, escalado, lote_recepcion))

    assert respuesta.status_code == 400
    assert "volvé a calcular" in respuesta.json()["detail"].lower()

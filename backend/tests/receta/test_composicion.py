import pytest

from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida


@pytest.fixture
def unidades(db_session):
    creadas = {
        "g": UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="g", activo=True, factor_base=1),
        "ml": UnidadMedida(tipo=TipoUnidadMedida.CAPACIDAD, sufijo="ml", activo=True, factor_base=1),
        "L": UnidadMedida(tipo=TipoUnidadMedida.CAPACIDAD, sufijo="L", activo=True, factor_base=1000),
        "un": UnidadMedida(tipo=TipoUnidadMedida.UNIDAD, sufijo="un", activo=True, factor_base=1),
        "caja": UnidadMedida(tipo=TipoUnidadMedida.UNIDAD, sufijo="caja", activo=True),
    }
    db_session.add_all(creadas.values())
    db_session.commit()
    return creadas


def renglon(insumo, cantidad, unidad, tipo="ingrediente"):
    return {"insumo_id": insumo.id, "tipo": tipo, "cantidad": cantidad, "unidad_medida_id": unidad.id}


def crear(client, headers, datos_receta, renglones):
    respuesta = client.post("/recetas/", headers=headers, json=datos_receta(renglones=renglones))
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def composicion(client, headers, version_id):
    respuesta = client.get(f"/recetas/versiones/{version_id}/composicion", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def test_500_g_mas_medio_kg_da_50_por_ciento_cada_uno(
    client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, unidad_medida, unidades
):
    receta = crear(
        client, headers_administradora, datos_receta,
        [renglon(insumo_activo, 500, unidades["g"]), renglon(otro_insumo_activo, 0.5, unidad_medida)],
    )

    datos = composicion(client, headers_administradora, receta["version_vigente"]["id"])

    assert datos["completa"] is True
    assert datos["total_gramos"] == 1000
    assert [(r["gramos"], r["porcentaje"]) for r in datos["ingredientes"]["renglones"]] == [(500, 50), (500, 50)]
    assert (datos["suma_porcentajes"], datos["diferencia"], datos["verificacion_ok"]) == (100, 0, True)
    assert datos["faltantes"] == []


def test_ingredientes_y_aditivos_en_grupos_separados(
    client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, insumo_aditivo, unidad_medida, unidades
):
    receta = crear(
        client, headers_administradora, datos_receta,
        [
            renglon(insumo_activo, 0.6, unidad_medida),
            renglon(otro_insumo_activo, 0.39, unidad_medida),
            renglon(insumo_aditivo, 10, unidades["g"], "aditivo"),
        ],
    )

    datos = composicion(client, headers_administradora, receta["version_vigente"]["id"])

    assert [r["porcentaje"] for r in datos["ingredientes"]["renglones"]] == [60, 39]
    assert datos["ingredientes"]["subtotal_porcentaje"] == 99
    assert [r["porcentaje"] for r in datos["aditivos"]["renglones"]] == [1]
    assert datos["aditivos"]["renglones"][0]["aditivo_referencia"]["ins"] == "202"


def test_convierte_ml_con_densidad_y_unidades_con_peso_por_unidad(
    client, db_session, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, unidad_medida, unidades
):
    otro_insumo_activo.densidad_g_ml = 0.92
    insumo_activo.peso_unidad_g = 50
    db_session.commit()
    receta = crear(
        client, headers_administradora, datos_receta,
        [renglon(insumo_activo, 4, unidades["un"]), renglon(otro_insumo_activo, 0.5, unidades["L"])],
    )

    datos = composicion(client, headers_administradora, receta["version_vigente"]["id"])

    assert [r["gramos"] for r in datos["ingredientes"]["renglones"]] == [200, 460]
    assert datos["total_gramos"] == 660


def test_si_falta_una_equivalencia_avisa_y_no_inventa_el_porcentaje(
    client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, unidad_medida, unidades
):
    receta = crear(
        client, headers_administradora, datos_receta,
        [renglon(insumo_activo, 1, unidad_medida), renglon(otro_insumo_activo, 200, unidades["ml"])],
    )

    datos = composicion(client, headers_administradora, receta["version_vigente"]["id"])

    assert datos["completa"] is False
    assert datos["total_gramos"] is None
    assert [r["porcentaje"] for r in datos["ingredientes"]["renglones"]] == [None, None]
    assert datos["ingredientes"]["renglones"][0]["gramos"] == 1000
    assert datos["verificacion_ok"] is False
    assert [(f["insumo"]["nombre"], f["equivalencia"]) for f in datos["faltantes"]] == [("Azúcar", "densidad")]
    assert "densidad" in datos["faltantes"][0]["mensaje"]


def test_unidad_sin_factor_tambien_se_avisa(
    client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, unidad_medida, unidades
):
    receta = crear(
        client, headers_administradora, datos_receta,
        [renglon(insumo_activo, 1, unidad_medida), renglon(otro_insumo_activo, 1, unidades["caja"])],
    )

    faltantes = composicion(client, headers_administradora, receta["version_vigente"]["id"])["faltantes"]

    assert [f["equivalencia"] for f in faltantes] == ["factor_unidad"]


def test_al_completar_la_equivalencia_se_recalcula(
    client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, unidad_medida, unidades
):
    receta = crear(
        client, headers_administradora, datos_receta,
        [renglon(insumo_activo, 0.8, unidad_medida), renglon(otro_insumo_activo, 200, unidades["ml"])],
    )

    actualizado = client.put(
        f"/insumos/{otro_insumo_activo.id}", headers=headers_administradora, json={"densidad_g_ml": 1}
    )

    assert actualizado.status_code == 200, actualizado.text
    datos = composicion(client, headers_administradora, receta["version_vigente"]["id"])
    assert datos["completa"] is True
    assert [r["porcentaje"] for r in datos["ingredientes"]["renglones"]] == [80, 20]


def test_al_cargar_el_factor_de_la_unidad_se_recalcula(
    client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, unidad_medida, unidades
):
    peso = client.put(
        f"/insumos/{otro_insumo_activo.id}", headers=headers_administradora, json={"peso_unidad_g": 100}
    )
    assert peso.status_code == 200
    receta = crear(
        client, headers_administradora, datos_receta,
        [renglon(insumo_activo, 0.6, unidad_medida), renglon(otro_insumo_activo, 1, unidades["caja"])],
    )

    respuesta = client.put(
        f"/unidades-medida/{unidades['caja'].id}", headers=headers_administradora, json={"factor_base": 4}
    )

    assert respuesta.status_code == 200, respuesta.text
    datos = composicion(client, headers_administradora, receta["version_vigente"]["id"])
    assert [r["gramos"] for r in datos["ingredientes"]["renglones"]] == [600, 400]


def test_la_suma_da_100_dentro_de_la_tolerancia(
    client, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, insumo_aditivo, unidad_medida, unidades
):
    receta = crear(
        client, headers_administradora, datos_receta,
        [
            renglon(insumo_activo, 1, unidades["g"]),
            renglon(otro_insumo_activo, 1, unidades["g"]),
            renglon(insumo_aditivo, 1, unidades["g"], "aditivo"),
        ],
    )

    datos = composicion(client, headers_administradora, receta["version_vigente"]["id"])

    assert [r["porcentaje"] for r in datos["ingredientes"]["renglones"] + datos["aditivos"]["renglones"]] == [
        33.33,
        33.33,
        33.33,
    ]
    assert datos["suma_porcentajes"] == 99.99
    assert datos["verificacion_ok"] is True
    assert datos["tolerancia"] == 0.1


def test_cada_version_conserva_su_propia_composicion(
    client, db_session, headers_administradora, datos_receta, insumo_activo, otro_insumo_activo, unidad_medida
):
    receta = crear(
        client, headers_administradora, datos_receta,
        [renglon(insumo_activo, 0.5, unidad_medida), renglon(otro_insumo_activo, 0.5, unidad_medida)],
    )
    nueva = datos_receta(renglones=[renglon(insumo_activo, 0.75, unidad_medida), renglon(otro_insumo_activo, 0.25, unidad_medida)])
    nueva.pop("producto_id")
    actualizada = client.post(
        f"/recetas/{receta['id']}/versiones",
        headers=headers_administradora,
        json={**nueva, "version_base_id": receta["version_vigente"]["id"], "motivo": "Más harina"},
    ).json()

    version_1 = composicion(client, headers_administradora, receta["version_vigente"]["id"])
    version_2 = composicion(client, headers_administradora, actualizada["version_vigente"]["id"])

    assert [r["porcentaje"] for r in version_1["ingredientes"]["renglones"]] == [50, 50]
    assert [r["porcentaje"] for r in version_2["ingredientes"]["renglones"]] == [75, 25]
    assert (version_1["estado"], version_2["estado"]) == ("archivada", "vigente")


def test_solo_administracion_ve_la_composicion(client, headers_administradora, headers_operadora, datos_receta):
    receta = client.post("/recetas/", headers=headers_administradora, json=datos_receta()).json()

    respuesta = client.get(
        f"/recetas/versiones/{receta['version_vigente']['id']}/composicion", headers=headers_operadora
    )

    assert respuesta.status_code == 403

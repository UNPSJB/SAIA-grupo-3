import pytest

from tests.rotuladoFrontal.utilidades import GALLETITA, conjunto, datos_editables, nueva_version, probar


def entrada(**cambios):
    datos = {**GALLETITA, "por_100": dict(GALLETITA["por_100"]), "hechos": list(GALLETITA["hechos"])}
    datos["por_100"].update(cambios.pop("por_100", {}))
    datos.update(cambios)
    return datos


def detalle(resultado, sello):
    return [d for d in resultado["detalle"] if d["sello"] == sello]


def test_sin_envase_en_ausencia_del_cliente_no_corresponde(client, headers_administradora, parametros):
    resultado = probar(client, headers_administradora, entrada(hechos=["agrega_azucares"]))

    assert resultado["aplicabilidad"]["resultado"] == "no_corresponde"
    assert resultado["sellos"] == [] and resultado["detalle"] == []


def test_sin_agregados_edulcorantes_ni_cafeina_queda_exceptuado(client, headers_administradora, parametros):
    resultado = probar(client, headers_administradora, entrada(hechos=["envasado_ausencia_cliente"]))

    assert resultado["aplicabilidad"]["resultado"] == "exceptuado"
    assert resultado["aplicabilidad"]["regla_orden"] == 2


def test_la_proporcion_de_energia_se_muestra_paso_a_paso(client, headers_administradora, parametros):
    resultado = probar(client, headers_administradora, GALLETITA)
    grasas = detalle(resultado, "grasas_totales")[0]

    assert grasas["operacion"] == "14 g × 9 kcal/g × 100 ÷ 450 kcal = 28 %"
    assert grasas["valor"] == pytest.approx(28)
    assert grasas["supera"] is False and grasas["simbolo"] == "≥"
    assert detalle(resultado, "grasas_saturadas")[0]["supera"] is True
    assert resultado["leyendas"] == ["EXCESO EN GRASAS SATURADAS", "EXCESO EN SODIO", "EXCESO EN CALORÍAS"]


def test_justo_en_el_umbral_respeta_la_comparacion_de_los_parametros(client, headers_administradora, parametros):
    justo = entrada(por_100={"energia": 400, "azucares_anadidos": 10})
    con_mayor_o_igual = probar(client, headers_administradora, justo)
    borrador = nueva_version(client, headers_administradora)
    datos = datos_editables(borrador)
    datos["umbrales"][0]["comparacion"] = "mayor"
    client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers_administradora, json=datos)
    con_mayor = probar(client, headers_administradora, justo, conjunto_id=borrador["id"])

    assert detalle(con_mayor_o_igual, "azucares")[0]["valor"] == pytest.approx(10)
    assert "azucares" in con_mayor_o_igual["sellos"]
    assert "azucares" not in con_mayor["sellos"]


def test_un_nutriente_que_no_se_agrega_no_se_evalua(client, headers_administradora, parametros):
    resultado = probar(
        client, headers_administradora,
        entrada(hechos=["envasado_ausencia_cliente", "agrega_azucares"], por_100={"azucares_anadidos": 20}),
    )
    grasas = detalle(resultado, "grasas_saturadas")[0]

    assert grasas["evaluado"] is False and "grasas añadidas" in grasas["motivo"]
    assert resultado["sellos"] == ["azucares", "calorias"]


def test_el_sello_de_calorias_necesita_otro_sello_de_azucares_o_grasas(client, headers_administradora, parametros):
    solo_sodio = probar(
        client, headers_administradora,
        entrada(hechos=["envasado_ausencia_cliente", "agrega_sodio"], por_100={"energia": 500}),
    )
    calorias = detalle(solo_sodio, "calorias")[0]

    assert solo_sodio["sellos"] == ["sodio"]
    assert calorias["evaluado"] is True and calorias["supera"] is False
    assert "junto con otro sello" in calorias["motivo"]


def test_una_bebida_sin_energia_usa_el_limite_de_sodio_por_100_ml(client, headers_administradora, parametros):
    agua = {
        "tipo": "liquido",
        "por_100": {"energia": 0, "sodio": 45},
        "energia_porcion": 0,
        "hechos": ["envasado_ausencia_cliente", "agrega_sodio"],
    }
    resultado = probar(client, headers_administradora, agua)
    sodio = detalle(resultado, "sodio")

    assert resultado["sellos"] == ["sodio"]
    assert sodio[0]["evaluado"] is False and "no aporta energía" in sodio[0]["motivo"]
    assert sodio[2]["supera"] is True
    assert detalle(resultado, "calorias")[0]["motivo"].startswith("Aplica solo a productos sólidos")


def test_edulcorantes_y_cafeina_agregan_sus_advertencias(client, headers_administradora, parametros):
    resultado = probar(
        client, headers_administradora,
        {"tipo": "liquido", "por_100": {"energia": 1}, "energia_porcion": 2,
         "hechos": ["envasado_ausencia_cliente", "contiene_edulcorantes", "contiene_cafeina"]},
    )

    assert resultado["aplicabilidad"]["resultado"] == "corresponde"
    assert resultado["advertencias"] == [
        "CONTIENE EDULCORANTES, NO RECOMENDABLE EN NIÑOS/AS",
        "CONTIENE CAFEÍNA. EVITAR EN NIÑOS/AS",
    ]
    assert resultado["sellos"] == []


def test_cambiar_una_regla_cambia_la_aplicabilidad_sin_tocar_el_codigo(client, headers_administradora, parametros):
    solo_cafeina = entrada(hechos=["envasado_ausencia_cliente", "contiene_cafeina"])
    antes = probar(client, headers_administradora, solo_cafeina)
    borrador = nueva_version(client, headers_administradora)
    datos = datos_editables(borrador)
    datos["reglas"][1]["hechos"] = ["agrega_azucares", "agrega_grasas", "agrega_sodio", "contiene_edulcorantes"]
    client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers_administradora, json=datos)
    despues = probar(client, headers_administradora, solo_cafeina, conjunto_id=borrador["id"])

    assert antes["aplicabilidad"]["resultado"] == "corresponde"
    assert despues["aplicabilidad"]["resultado"] == "exceptuado"
    assert conjunto(client, headers_administradora, borrador["id"])["reglas"][1]["hechos"] == datos["reglas"][1]["hechos"]

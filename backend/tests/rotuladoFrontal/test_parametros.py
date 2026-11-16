from datetime import date

from src.config import settings
from scripts.datos_iniciales_rotulado_frontal import cargar_parametros_iniciales
from tests.rotuladoFrontal.utilidades import GALLETITA, conjunto, datos_editables, nueva_version, probar


def test_los_parametros_iniciales_quedan_vigentes_con_su_norma_y_fecha(
    client, headers_administradora, parametros, db_session
):
    vigente = client.get("/rotulado-frontal/parametros/vigente", headers=headers_administradora).json()

    assert vigente["id"] == parametros and vigente["numero"] == 1 and vigente["estado"] == "vigente"
    assert vigente["fecha_vigencia"] == "2024-12-27"
    assert "Ley 27.642" in vigente["norma_origen"] and "11362/2024" in vigente["norma_origen"]
    assert [u["sello"] for u in vigente["umbrales"]] == [
        "azucares", "grasas_totales", "grasas_saturadas", "sodio", "sodio", "sodio", "calorias", "calorias"
    ]
    assert [r["resultado"] for r in vigente["reglas"]] == ["no_corresponde", "exceptuado", "corresponde"]
    assert len(vigente["advertencias"]) == 2
    assert cargar_parametros_iniciales(db_session) is None


def test_una_version_nueva_copia_la_vigente_como_borrador(client, headers_administradora, parametros):
    borrador = nueva_version(client, headers_administradora)
    vigente = conjunto(client, headers_administradora, parametros)
    otro = client.post("/rotulado-frontal/parametros", headers=headers_administradora, json={"motivo": "Otro"})

    assert borrador["numero"] == 2 and borrador["estado"] == "borrador"
    assert borrador["version_base_id"] == parametros and borrador["fecha_vigencia"] is None
    assert datos_editables(borrador)["umbrales"] == datos_editables(vigente)["umbrales"]
    assert otro.status_code == 400 and "borrador" in otro.json()["detail"]


def test_no_se_puede_editar_ni_descartar_un_conjunto_vigente(client, headers_administradora, parametros):
    vigente = conjunto(client, headers_administradora, parametros)
    datos = datos_editables(vigente)
    datos["umbrales"][0]["limite"] = 5

    editar = client.put(f"/rotulado-frontal/parametros/{parametros}", headers=headers_administradora, json=datos)
    borrar = client.delete(f"/rotulado-frontal/parametros/{parametros}", headers=headers_administradora)
    publicar = client.post(f"/rotulado-frontal/parametros/{parametros}/publicar", headers=headers_administradora)

    assert editar.status_code == 400 and "versión nueva" in editar.json()["detail"]
    assert borrar.status_code == 400 and publicar.status_code == 400
    assert conjunto(client, headers_administradora, parametros)["umbrales"][0]["limite"] == 10


def test_publicar_un_borrador_archiva_el_anterior(client, headers_administradora, parametros):
    borrador = nueva_version(client, headers_administradora)
    sin_fecha = client.post(f"/rotulado-frontal/parametros/{borrador['id']}/publicar", headers=headers_administradora)
    datos = datos_editables(borrador)
    datos["fecha_vigencia"] = "2026-12-01"
    datos["reglas"] = datos["reglas"][:2]
    client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers_administradora, json=datos)
    sin_regla_final = client.post(f"/rotulado-frontal/parametros/{borrador['id']}/publicar", headers=headers_administradora)
    datos["reglas"] = datos_editables(borrador)["reglas"]
    client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers_administradora, json=datos)

    publicado = client.post(f"/rotulado-frontal/parametros/{borrador['id']}/publicar", headers=headers_administradora)
    anterior = conjunto(client, headers_administradora, parametros)
    lista = client.get("/rotulado-frontal/parametros", headers=headers_administradora).json()

    assert sin_fecha.status_code == 400 and "fecha de vigencia" in sin_fecha.json()["detail"]
    assert sin_regla_final.status_code == 400 and "siempre" in sin_regla_final.json()["detail"]
    assert publicado.status_code == 200, publicado.text
    assert publicado.json()["estado"] == "vigente" and publicado.json()["publicado_por"] is not None
    assert anterior["estado"] == "archivado" and anterior["archivado_en"] is not None
    assert [(c["numero"], c["estado"]) for c in lista] == [(2, "vigente"), (1, "archivado")]


def test_los_calculos_nuevos_usan_la_version_nueva_y_los_viejos_se_reconstruyen_con_la_suya(
    client, headers_administradora, parametros
):
    antes = probar(client, headers_administradora, GALLETITA)
    borrador = nueva_version(client, headers_administradora, motivo="Umbral de azúcares más estricto")
    datos = datos_editables(borrador)
    datos["umbrales"][0]["limite"] = 8
    datos["fecha_vigencia"] = date(2026, 12, 1).isoformat()
    client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers_administradora, json=datos)
    client.post(f"/rotulado-frontal/parametros/{borrador['id']}/publicar", headers=headers_administradora)

    despues = probar(client, headers_administradora, GALLETITA)
    reconstruido = probar(client, headers_administradora, GALLETITA, conjunto_id=antes["conjunto"]["id"])

    assert antes["conjunto"]["numero"] == 1 and "azucares" not in antes["sellos"]
    assert despues["conjunto"]["numero"] == 2 and "azucares" in despues["sellos"]
    assert {k: v for k, v in reconstruido.items() if k != "conjunto"} == {k: v for k, v in antes.items() if k != "conjunto"}
    assert reconstruido["conjunto"]["numero"] == 1 and reconstruido["conjunto"]["estado"] == "archivado"


def test_con_el_modulo_apagado_sus_endpoints_no_responden_y_el_resto_si(
    client, headers_administradora, parametros, monkeypatch
):
    monkeypatch.setattr(settings, "ROTULADO_FRONTAL_ACTIVO", False)

    parametros_resp = client.get("/rotulado-frontal/parametros", headers=headers_administradora)
    prueba = client.post("/rotulado-frontal/parametros/probar", headers=headers_administradora, json=GALLETITA)
    estado = client.get("/rotulado-frontal/estado", headers=headers_administradora)
    insumos = client.get("/insumos/", headers=headers_administradora)
    nutricion = client.get("/nutricion/configuracion", headers=headers_administradora)

    assert parametros_resp.status_code == 503 and "desactivado" in parametros_resp.json()["detail"]
    assert prueba.status_code == 503
    assert estado.status_code == 200 and estado.json() == {"activo": False}
    assert insumos.status_code == 200 and nutricion.status_code == 200


def test_solo_quien_administra_mantiene_los_parametros(client, headers_operadora, parametros):
    assert client.get("/rotulado-frontal/parametros", headers=headers_operadora).status_code == 403
    assert client.post("/rotulado-frontal/parametros", headers=headers_operadora, json={"motivo": "x"}).status_code == 403
    assert client.get("/rotulado-frontal/estado", headers=headers_operadora).json() == {"activo": True}


def test_un_umbral_por_proporcion_de_energia_exige_el_factor(client, headers_administradora, parametros):
    borrador = nueva_version(client, headers_administradora)
    datos = datos_editables(borrador)
    datos["umbrales"][0]["factor_energetico"] = None

    respuesta = client.put(f"/rotulado-frontal/parametros/{borrador['id']}", headers=headers_administradora, json=datos)

    assert respuesta.status_code == 422
    assert "factor energético" in respuesta.text


def test_sin_parametros_cargados_el_calculo_lo_informa(client, headers_administradora):
    respuesta = client.post("/rotulado-frontal/parametros/probar", headers=headers_administradora, json=GALLETITA)

    assert respuesta.status_code == 404
    assert "parámetros iniciales" in respuesta.json()["detail"]

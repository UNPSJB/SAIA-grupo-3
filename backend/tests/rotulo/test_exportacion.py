import json
from datetime import datetime

import pytest

from src.config import settings
from src.rotulo.exportacion import menciones_no_permitidas
from src.rotulo.models import ExportacionRotulo
from tests.rotuladoFrontal.conftest import ingredientes_rotulado, parametros, unidad_gramo
from tests.rotuladoFrontal.test_sellos import calcular, con_valores, evaluar, producto
from tests.rotulo.test_borrador import crear, datos_desde, guardar, ruta

__all__ = ["ingredientes_rotulado", "parametros", "unidad_gramo", "con_valores", "producto"]

LEYENDA = (
    "BORRADOR: debe ser revisado por un/a profesional y por la autoridad sanitaria competente antes de su uso"
)


def exportar(client, headers, producto_id, codigo=200):
    respuesta = client.post(f"{ruta(producto_id)}/exportaciones", headers=headers)
    assert respuesta.status_code == codigo, respuesta.text
    return respuesta.json()


@pytest.fixture
def sin_octogonos(monkeypatch):
    monkeypatch.setattr(settings, "ROTULADO_FRONTAL_ACTIVO", False)


def test_exportar_registra_la_fecha_la_version_de_receta_y_la_persona(
    client, headers_administradora, producto_id, persona_administradora, db_session, sin_octogonos
):
    crear(client, headers_administradora, producto_id)
    antes = datetime.now()

    exportacion = exportar(client, headers_administradora, producto_id)

    assert exportacion["numero"] == 1
    assert exportacion["version_receta_numero"] == 1
    assert exportacion["generado_por"]["id"] == persona_administradora.id
    assert datetime.fromisoformat(exportacion["generado_en"]) >= antes.replace(microsecond=0)
    assert exportacion["conjunto_parametros_numero"] is None
    registro = db_session.get(ExportacionRotulo, exportacion["id"])
    assert registro.version_receta_numero == 1 and registro.generado_por_id == persona_administradora.id
    assert registro.version_receta_id == exportacion["anexo"]["receta"]["id"]

    segunda = exportar(client, headers_administradora, producto_id)
    historial = client.get(f"{ruta(producto_id)}/exportaciones", headers=headers_administradora).json()

    assert segunda["numero"] == 2
    assert [e["numero"] for e in historial] == [2, 1]
    assert historial[0]["generado_por"]["id"] == persona_administradora.id


def test_el_anexo_trae_la_composicion_la_tabla_con_sus_fuentes_y_los_sellos_con_su_version(
    client, headers_administradora, producto
):
    prod = producto()
    evaluar(client, headers_administradora, prod)
    calcular(client, headers_administradora, prod)
    crear(client, headers_administradora, prod)

    exportacion = exportar(client, headers_administradora, prod)
    anexo = exportacion["anexo"]

    renglones = anexo["composicion"]["ingredientes"]["renglones"]
    assert {r["insumo"]["nombre"] for r in renglones} == {"Harina", "Azúcar", "Aceite", "Sal"}
    assert sum(r["porcentaje"] for r in renglones) == pytest.approx(100, abs=0.1)
    assert anexo["receta"]["numero"] == 1 and len(anexo["receta"]["renglones"]) == 4
    fuentes = {f["insumo"]: f for f in anexo["fuentes"]}
    assert fuentes["Harina"]["fuentes"] == ["Bibliografía"]
    assert fuentes["Harina"]["detalles"] == ["Prueba"]
    assert fuentes["Harina"]["nutrientes_cargados"] == 10
    assert anexo["informacion_nutricional"]["completa"] is True
    assert anexo["informacion_nutricional"]["filas"]
    calculo = anexo["rotulado_frontal"]["calculo"]
    assert calculo["conjunto"]["numero"] == 1
    assert calculo["conjunto"]["fecha_vigencia"]
    assert calculo["leyendas"] == ["EXCESO EN AZÚCARES", "EXCESO EN SODIO", "EXCESO EN CALORÍAS"]
    assert calculo["detalle"]
    assert anexo["conjunto_parametros_numero"] == 1
    assert exportacion["conjunto_parametros_numero"] == 1


def test_el_contenido_exportado_incluye_la_leyenda_y_no_menciona_aprobacion(
    client, headers_administradora, producto_id, sin_octogonos
):
    crear(client, headers_administradora, producto_id)

    exportacion = exportar(client, headers_administradora, producto_id)
    texto = json.dumps(exportacion, ensure_ascii=False).lower()

    assert exportacion["vista_previa"]["leyenda_borrador"] == LEYENDA
    assert menciones_no_permitidas(exportacion) == []
    for palabra in ("aprobado", "aprobación", "conforme", "conformidad", "certificado", "certificación"):
        assert palabra not in texto


def test_un_texto_con_mencion_de_certificacion_impide_exportar(
    client, headers_administradora, producto_id, db_session, sin_octogonos
):
    borrador = crear(client, headers_administradora, producto_id)
    guardar(
        client, headers_administradora, producto_id,
        datos_desde(borrador, razon_social="Panificadora Certificada S.A.", instrucciones=None),
    )

    respuesta = client.post(f"{ruta(producto_id)}/exportaciones", headers=headers_administradora)

    assert respuesta.status_code == 400
    assert "«certificada» en Razón social" in respuesta.json()["detail"]
    assert db_session.query(ExportacionRotulo).count() == 0


def test_la_referencia_a_una_norma_aprobada_no_se_considera_mencion_del_rotulo():
    assert menciones_no_permitidas({"norma_origen": "Manual aprobado por Disposición ANMAT 11362/2024"}) == []
    assert menciones_no_permitidas({"leyenda_duracion": "Rótulo aprobado"}) == [("aprobado", "Leyenda de duración")]


def test_una_persona_con_permiso_de_operar_no_puede_exportar(
    client, headers_administradora, headers_operadora, producto_id, sin_octogonos
):
    crear(client, headers_administradora, producto_id)

    exportar(client, headers_operadora, producto_id, codigo=403)
    historial = client.get(f"{ruta(producto_id)}/exportaciones", headers=headers_operadora)

    assert historial.status_code == 403


def test_sin_receta_vigente_no_hay_respaldo_para_exportar(
    client, headers_administradora, nuevo_producto, sin_octogonos
):
    producto_id = nuevo_producto("Sin receta")
    crear(client, headers_administradora, producto_id)

    respuesta = exportar(client, headers_administradora, producto_id, codigo=400)

    assert "receta vigente" in respuesta["detail"]


def test_una_exportacion_guardada_conserva_lo_que_se_exporto(
    client, headers_administradora, producto_id, sin_octogonos
):
    borrador = crear(client, headers_administradora, producto_id)
    guardar(client, headers_administradora, producto_id, datos_desde(borrador, razon_social="El Trigal"))
    exportacion = exportar(client, headers_administradora, producto_id)
    actual = client.get(ruta(producto_id), headers=headers_administradora).json()
    guardar(client, headers_administradora, producto_id, datos_desde(actual, razon_social="Otro nombre"))

    guardada = client.get(f"/rotulos/exportaciones/{exportacion['id']}", headers=headers_administradora).json()

    assert guardada["vista_previa"]["borrador"]["razon_social"] == "El Trigal"
    assert guardada["numero"] == 1

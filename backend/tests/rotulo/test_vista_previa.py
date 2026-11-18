from datetime import date

from src.config import settings
from src.receta.models import VersionReceta
from src.rotulo.constants import LEYENDA_BORRADOR
from src.rotulo.vista_previa import fecha_de_duracion, sumar_meses
from tests.rotulo.test_borrador import COMPLETO, crear, datos_desde, guardar, ruta

LEYENDA = (
    "BORRADOR: debe ser revisado por un/a profesional y por la autoridad sanitaria competente antes de su uso"
)


def vista_previa(client, headers, producto_id, codigo=200):
    respuesta = client.get(f"{ruta(producto_id)}/vista-previa", headers=headers)
    assert respuesta.status_code == codigo, respuesta.text
    return respuesta.json()


def test_la_vista_previa_incluye_la_leyenda_y_el_estado_de_completitud(
    client, headers_administradora, producto_id
):
    crear(client, headers_administradora, producto_id)

    vista = vista_previa(client, headers_administradora, producto_id)

    assert vista["leyenda_borrador"] == LEYENDA == LEYENDA_BORRADOR
    completitud = vista["borrador"]["completitud"]
    assert 0 < completitud["porcentaje"] < 100
    assert [f["campo"] for f in vista["faltantes"]] == [f["campo"] for f in completitud["faltantes"]]
    assert {"contenido_neto", "razon_social", "numero_registro"} <= {f["campo"] for f in vista["faltantes"]}
    assert vista["lista_para_revision"] is False
    assert vista["advertencias"][0].startswith(f"Faltan {len(vista['faltantes'])} datos obligatorios")
    assert vista["borrador"]["lista_ingredientes"].startswith("Ingredientes: Harina de trigo 000")
    assert vista["informacion_nutricional"]["completa"] is True
    assert vista["informacion_nutricional"]["filas"]
    assert vista["tabla_incompleta"] is False


def test_un_producto_con_la_tabla_incompleta_devuelve_la_advertencia(
    client, headers_administradora, db_session, receta_referencia_incompleta
):
    producto_id = db_session.get(VersionReceta, receta_referencia_incompleta).receta.producto_id
    crear(client, headers_administradora, producto_id)

    vista = vista_previa(client, headers_administradora, producto_id)

    assert vista["tabla_incompleta"] is True
    assert vista["informacion_nutricional"]["completa"] is False
    assert any("tabla nutricional está incompleta" in a for a in vista["advertencias"])
    assert "informacion_nutricional" in {f["campo"] for f in vista["faltantes"]}
    assert vista["leyenda_borrador"] == LEYENDA
    assert vista["lista_para_revision"] is False


def test_un_producto_completo_queda_listo_para_revision(
    client, headers_administradora, producto_id, unidades, nuevo_lote, monkeypatch
):
    monkeypatch.setattr(settings, "ROTULADO_FRONTAL_ACTIVO", False)
    nuevo_lote(producto_id, "L-2026-001", date(2026, 11, 1))
    borrador = crear(client, headers_administradora, producto_id)
    guardar(
        client, headers_administradora, producto_id,
        datos_desde(borrador, contenido_neto_unidad_id=unidades["g"].id, **COMPLETO),
    )
    client.post(f"{ruta(producto_id)}/alergenos/confirmar", headers=headers_administradora)

    vista = vista_previa(client, headers_administradora, producto_id)

    assert vista["faltantes"] == [] and vista["advertencias"] == []
    assert vista["lista_para_revision"] is True
    assert vista["leyenda_borrador"] == LEYENDA
    assert vista["contenido_neto_texto"] == "500 g"
    assert vista["fecha_duracion"] == {
        "leyenda": "Consumir preferentemente antes del",
        "fecha": "2026-11-06",
        "lote_codigo": "L-2026-001",
        "lote_fecha_produccion": "2026-11-01",
    }
    assert vista["borrador"]["rotulado_frontal"] is None


def test_con_octogonos_activos_informa_si_falta_evaluar_el_rotulado_frontal(
    client, headers_administradora, producto_id
):
    crear(client, headers_administradora, producto_id)

    vista = vista_previa(client, headers_administradora, producto_id)

    assert vista["borrador"]["rotulado_frontal"]["resultado"] is None
    assert "rotulado_frontal" in {f["campo"] for f in vista["faltantes"]}


def test_sin_borrador_no_hay_vista_previa_y_solo_quien_administra_la_ve(
    client, headers_administradora, headers_operadora, producto_id
):
    vista_previa(client, headers_administradora, producto_id, codigo=404)
    crear(client, headers_administradora, producto_id)

    vista_previa(client, headers_operadora, producto_id, codigo=403)


def test_la_fecha_de_duracion_suma_dias_o_meses():
    assert fecha_de_duracion(date(2026, 11, 1), 5, "dias") == date(2026, 11, 6)
    assert fecha_de_duracion(date(2026, 1, 31), 1, "meses") == date(2026, 2, 28)
    assert sumar_meses(date(2026, 11, 30), 3) == date(2027, 2, 28)

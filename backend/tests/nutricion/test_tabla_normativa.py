from src.nutricion.models import ConfiguracionNutricional, ReglaExpresionNutriente
from tests.nutricion.utilidades import configuracion, guardar, informacion

OBLIGATORIOS_EN_ORDEN = [
    ("energia", "Valor energético"),
    ("carbohidratos", "Carbohidratos"),
    ("azucares_totales", "Azúcares totales"),
    ("azucares_anadidos", "Azúcares añadidos"),
    ("proteinas", "Proteínas"),
    ("grasas_totales", "Grasas totales"),
    ("grasas_saturadas", "Grasas saturadas"),
    ("grasas_trans", "Grasas trans"),
    ("fibra", "Fibra alimentaria"),
    ("sodio", "Sodio"),
]


def test_el_endpoint_incluye_los_nutrientes_obligatorios_en_orden_la_porcion_y_la_leyenda(
    client, headers_administradora, receta_referencia
):
    info = informacion(client, headers_administradora, receta_referencia["version_vigente"]["id"])
    obligatorias = [(f["nutriente"], f["nombre_rotulo"]) for f in info["filas"] if f["obligatorio"]]

    assert obligatorias == OBLIGATORIOS_EN_ORDEN
    assert [f["orden"] for f in info["filas"]] == list(range(1, 11))
    assert (info["porcion_cantidad"], info["porcion_unidad"], info["porcion_medida_casera"]) == (50, "g", "1 rebanada")
    assert info["porcion_base"] == 50
    assert info["producto"] == "Pan casero" and info["receta_id"] == receta_referencia["id"]
    assert info["completa"] is True
    assert "revisados por un/a profesional" in info["leyenda_revision"]
    assert info["leyenda_vd"].startswith("% Valores Diarios")
    assert info["leyenda_incompleta"]


def test_el_orden_el_nombre_y_la_obligatoriedad_se_configuran_sin_tocar_el_codigo(
    client, headers_administradora, receta_referencia
):
    config = configuracion(client, headers_administradora)
    for fila in config["nutrientes"]:
        if fila["nutriente"] == "sodio":
            fila.update(orden=2, nombre_rotulo="Sodio (Na)")
        elif fila["nutriente"] == "grasas_trans":
            fila["obligatorio"] = False
        elif fila["orden"] >= 2:
            fila["orden"] += 1
    config["leyenda_revision"] = "Borrador para revisión de la Lic. en Nutrición."

    respuesta = guardar(client, headers_administradora, config)
    info = informacion(client, headers_administradora, receta_referencia["version_vigente"]["id"])
    obligatorias = [f["nombre_rotulo"] for f in info["filas"] if f["obligatorio"]]

    assert respuesta.status_code == 200, respuesta.text
    assert obligatorias[:3] == ["Valor energético", "Sodio (Na)", "Carbohidratos"]
    assert "Grasas trans" not in obligatorias and len(obligatorias) == 9
    assert info["leyenda_revision"] == "Borrador para revisión de la Lic. en Nutrición."
    assert [f["nutriente"] for f in configuracion(client, headers_administradora)["nutrientes"]][:2] == ["energia", "sodio"]


def test_la_leyenda_de_revision_no_puede_quedar_vacia(client, headers_administradora):
    config = configuracion(client, headers_administradora)
    config["leyenda_revision"] = "   "

    assert guardar(client, headers_administradora, config).status_code == 422


def test_una_tabla_incompleta_lo_informa_junto_con_la_leyenda(
    client, headers_administradora, receta_referencia_incompleta
):
    info = informacion(client, headers_administradora, receta_referencia_incompleta)

    assert info["completa"] is False
    assert "No usar en un rótulo" in info["leyenda_incompleta"]
    assert info["leyenda_revision"]


def test_una_base_migrada_completa_el_nombre_y_el_orden_que_faltan(client, headers_administradora, db_session):
    configuracion(client, headers_administradora)
    for regla in db_session.query(ReglaExpresionNutriente).all():
        regla.nombre_rotulo = ""
        regla.orden = 0
    db_session.get(ConfiguracionNutricional, 1).leyenda_revision = ""
    db_session.commit()

    config = configuracion(client, headers_administradora)

    assert [(f["nutriente"], f["nombre_rotulo"]) for f in config["nutrientes"]] == OBLIGATORIOS_EN_ORDEN
    assert [f["orden"] for f in config["nutrientes"]] == list(range(1, 11))
    assert config["leyenda_revision"]

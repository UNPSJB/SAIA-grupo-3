import pytest

from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from tests.nutricion.utilidades import (
    NUTRIENTES,
    REFERENCIA,
    cargar_referencia,
    cargar_valores,
    crear_receta,
    datos_version,
    dentro_de_tolerancia,
    filas,
    informacion,
)


@pytest.fixture
def receta_referencia(client, headers_administradora, unidades, ingredientes, nuevo_producto):
    cargar_referencia(client, headers_administradora, ingredientes)
    return crear_receta(
        client, headers_administradora, nuevo_producto("Pan casero"), datos_version(unidades, ingredientes)
    )


def test_el_producto_de_referencia_da_los_valores_validados_dentro_de_la_tolerancia(
    client, headers_administradora, receta_referencia
):
    info = informacion(client, headers_administradora, receta_referencia["version_vigente"]["id"])
    valores = filas(info)

    assert info["completa"] is True and info["faltantes"] == []
    assert info["base"] == "g" and info["rendimiento_base"] == REFERENCIA["rendimiento_g"]
    for nutriente in NUTRIENTES:
        por_100 = valores[nutriente]["por_100"]["calculado"]
        por_porcion = valores[nutriente]["por_porcion"]["calculado"]
        assert dentro_de_tolerancia(por_100, REFERENCIA["esperado_por_100g"][nutriente]), nutriente
        assert dentro_de_tolerancia(por_porcion, REFERENCIA["esperado_por_porcion"][nutriente]), nutriente


def test_un_rendimiento_menor_por_la_coccion_concentra_los_nutrientes(
    client, headers_administradora, receta_referencia, unidades, ingredientes, nuevo_producto
):
    cocido = crear_receta(
        client,
        headers_administradora,
        nuevo_producto("Pan casero bien cocido"),
        datos_version(unidades, ingredientes, rendimiento=1200),
    )
    normal = filas(informacion(client, headers_administradora, receta_referencia["version_vigente"]["id"]))
    concentrado = filas(informacion(client, headers_administradora, cocido["version_vigente"]["id"]))

    for nutriente in ("energia", "carbohidratos", "sodio"):
        assert concentrado[nutriente]["por_100"]["calculado"] == pytest.approx(
            normal[nutriente]["por_100"]["calculado"] * 1500 / 1200
        )


def test_valores_por_porcion_y_porcentaje_de_valor_diario(client, headers_administradora, receta_referencia):
    info = informacion(client, headers_administradora, receta_referencia["version_vigente"]["id"])
    valores = filas(info)

    assert info["porcion_base"] == 50 and info["porcion_medida_casera"] == "1 rebanada"
    assert valores["energia"]["por_porcion"]["texto"] == "126"
    assert valores["energia"]["porcentaje_vd"]["texto"] == "6"
    assert valores["carbohidratos"]["por_porcion"]["texto"] == "25"
    assert valores["carbohidratos"]["porcentaje_vd"]["texto"] == "8"
    assert valores["proteinas"]["por_porcion"]["texto"] == "3,4"
    assert valores["sodio"]["por_porcion"]["texto"] == "259"
    assert valores["sodio"]["porcentaje_vd"]["valor"] == 11
    assert valores["azucares_totales"]["porcentaje_vd"] is None
    assert valores["grasas_trans"]["porcentaje_vd"] is None
    assert info["energia_kj"]["por_porcion"]["texto"] == "529"


def configuracion(client, headers):
    respuesta = client.get("/nutricion/configuracion", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def guardar(client, headers, config):
    datos = {
        "expresion_no_significativo": config["expresion_no_significativo"],
        "decimales_vd": config["decimales_vd"],
        "leyenda_vd": config["leyenda_vd"],
        "nutrientes": [
            {k: fila[k] for k in ("nutriente", "valor_diario", "unidad", "decimales", "entero_desde", "umbral_no_significativo")}
            for fila in config["nutrientes"]
        ],
    }
    return client.put("/nutricion/configuracion", headers=headers, json=datos)


def test_cambiar_una_regla_de_redondeo_cambia_la_expresion_sin_tocar_el_codigo(
    client, headers_administradora, receta_referencia
):
    version_id = receta_referencia["version_vigente"]["id"]
    config = configuracion(client, headers_administradora)
    for fila in config["nutrientes"]:
        if fila["nutriente"] == "carbohidratos":
            fila.update(decimales=2, entero_desde=None, unidad="gr")
    config["decimales_vd"] = 1

    respuesta = guardar(client, headers_administradora, config)
    carbohidratos = filas(informacion(client, headers_administradora, version_id))["carbohidratos"]

    assert respuesta.status_code == 200, respuesta.text
    assert carbohidratos["por_porcion"]["texto"] == "24,79"
    assert carbohidratos["por_100"]["texto"] == "49,57"
    assert carbohidratos["unidad"] == "gr"
    assert carbohidratos["porcentaje_vd"]["texto"] == "8,3"


def test_un_valor_debajo_del_umbral_se_muestra_como_no_significativo(
    client, headers_administradora, receta_referencia
):
    version_id = receta_referencia["version_vigente"]["id"]
    saturadas = filas(informacion(client, headers_administradora, version_id))["grasas_saturadas"]

    assert saturadas["por_porcion"]["no_significativo"] is True
    assert saturadas["por_porcion"]["texto"] == "0"
    assert saturadas["porcentaje_vd"]["texto"] == "0"
    assert saturadas["por_100"]["no_significativo"] is False
    assert saturadas["por_100"]["texto"] == "0,4"

    config = configuracion(client, headers_administradora)
    config["expresion_no_significativo"] = "no contiene"
    for fila in config["nutrientes"]:
        if fila["nutriente"] == "grasas_saturadas":
            fila["umbral_no_significativo"] = 0.5
    guardar(client, headers_administradora, config)
    saturadas = filas(informacion(client, headers_administradora, version_id))["grasas_saturadas"]

    assert saturadas["por_100"]["texto"] == "no contiene"
    assert saturadas["por_100"]["calculado"] == pytest.approx(0.3573, abs=1e-3)


def test_la_configuracion_inicial_sigue_el_rotulado_nutricional_mercosur(client, headers_administradora):
    config = {fila["nutriente"]: fila for fila in configuracion(client, headers_administradora)["nutrientes"]}

    assert config["energia"]["valor_diario"] == 2000 and config["energia"]["umbral_no_significativo"] == 4
    assert config["sodio"]["valor_diario"] == 2400 and config["sodio"]["umbral_no_significativo"] == 5
    assert config["grasas_saturadas"]["valor_diario"] == 22
    assert config["grasas_trans"]["valor_diario"] is None
    assert config["proteinas"]["entero_desde"] == 10 and config["proteinas"]["decimales"] == 1


def test_la_configuracion_exige_todos_los_nutrientes_y_permiso_de_administrar(
    client, headers_administradora, headers_operadora
):
    config = configuracion(client, headers_administradora)
    config["nutrientes"] = config["nutrientes"][1:]

    incompleta = guardar(client, headers_administradora, config)
    sin_permiso = client.get("/nutricion/configuracion", headers=headers_operadora)

    assert incompleta.status_code == 400
    assert "Valor energético" in incompleta.json()["detail"]
    assert sin_permiso.status_code == 403


def test_cambiar_un_dato_del_insumo_recalcula_la_version_vigente_y_no_la_archivada(
    client, headers_administradora, receta_referencia, unidades, ingredientes
):
    receta_id = receta_referencia["id"]
    archivada_id = receta_referencia["version_vigente"]["id"]
    nueva = client.post(
        f"/recetas/{receta_id}/versiones",
        headers=headers_administradora,
        json={**datos_version(unidades, ingredientes), "version_base_id": archivada_id, "motivo": "Ajuste"},
    ).json()
    vigente_id = nueva["version_vigente"]["id"]
    harina = ingredientes["Harina de trigo 000"]

    client.patch(
        f"/nutricion/insumos/{harina.id}/valores", headers=headers_administradora, json={"valores": {"energia": 360}}
    )
    vigente = filas(informacion(client, headers_administradora, vigente_id))["energia"]["por_100"]["calculado"]
    archivada = filas(informacion(client, headers_administradora, archivada_id))["energia"]["por_100"]["calculado"]

    assert vigente == pytest.approx((3775.2 + 200) * 100 / 1500)
    assert archivada == pytest.approx(251.68)


def test_un_insumo_sin_datos_deja_la_tabla_incompleta(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, db_session
):
    cargar_referencia(client, headers_administradora, ingredientes)
    semillas = Insumo(nombre="Semillas", unidad_medida_id=unidades["g"].id, tipo=TipoInsumo.INGREDIENTE, activo=True)
    db_session.add(semillas)
    db_session.commit()
    semillas_id = semillas.id
    datos = datos_version(unidades, ingredientes)
    datos["renglones"].append(
        {"insumo_id": semillas_id, "tipo": "ingrediente", "cantidad": 50, "unidad_medida_id": unidades["g"].id}
    )
    receta = crear_receta(client, headers_administradora, nuevo_producto("Pan con semillas"), datos)
    version_id = receta["version_vigente"]["id"]
    cargar_valores(client, headers_administradora, semillas_id, {"energia": 500, "sodio": 10})

    info = informacion(client, headers_administradora, version_id)
    valores = filas(info)

    assert info["completa"] is False
    assert any("Semillas" in f["mensaje"] and "fibra alimentaria" in f["mensaje"] for f in info["faltantes"])
    assert valores["energia"]["por_100"]["calculado"] == pytest.approx((3775.2 + 250) * 100 / 1500)
    assert valores["fibra"]["por_100"] is None


def test_rendimiento_en_unidades_necesita_el_peso_final(
    client, headers_administradora, unidades, ingredientes, nuevo_producto
):
    cargar_referencia(client, headers_administradora, ingredientes)
    sin_peso = crear_receta(
        client, headers_administradora, nuevo_producto("Pancitos"),
        datos_version(unidades, ingredientes, rendimiento=30, unidad="un", porcion=1, porcion_unidad="un"),
    )
    con_peso = crear_receta(
        client, headers_administradora, nuevo_producto("Pancitos pesados"),
        datos_version(unidades, ingredientes, rendimiento=30, unidad="un", porcion=1, porcion_unidad="un", rendimiento_peso_g=1500),
    )

    info_sin = informacion(client, headers_administradora, sin_peso["version_vigente"]["id"])
    info_con = informacion(client, headers_administradora, con_peso["version_vigente"]["id"])

    assert info_sin["completa"] is False and "peso final" in info_sin["faltantes"][0]["mensaje"]
    assert filas(info_sin)["energia"]["por_100"] is None
    assert info_con["completa"] is True and info_con["porcion_base"] == 50
    assert filas(info_con)["energia"]["por_porcion"]["calculado"] == pytest.approx(125.84)


def test_un_producto_liquido_se_expresa_por_100_ml(
    client, headers_administradora, unidades, ingredientes, nuevo_producto
):
    cargar_referencia(client, headers_administradora, ingredientes)
    receta = crear_receta(
        client, headers_administradora, nuevo_producto("Salsa"),
        datos_version(unidades, ingredientes, rendimiento=1.5, unidad="L", porcion=0.05, porcion_unidad="L"),
    )
    info = informacion(client, headers_administradora, receta["version_vigente"]["id"])

    assert info["base"] == "ml" and info["rendimiento_base"] == 1500 and info["porcion_base"] == 50
    assert filas(info)["energia"]["por_100"]["calculado"] == pytest.approx(251.68)


def test_el_aditivo_suma_energia_y_sodio_solo_con_la_marca_de_aporte(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, db_session
):
    cargar_referencia(client, headers_administradora, ingredientes)
    clase = ClaseFuncional(nombre="Leudante", ins_opcional=False, activo=True)
    db_session.add(clase)
    db_session.flush()
    referencia = AditivoReferencia(clase_funcional_id=clase.id, nombre="Bicarbonato de sodio", ins="500ii", activo=True)
    db_session.add(referencia)
    db_session.flush()
    bicarbonato = Insumo(
        nombre="Bicarbonato",
        unidad_medida_id=unidades["g"].id,
        tipo=TipoInsumo.ADITIVO,
        aditivo_referencia_id=referencia.id,
        activo=True,
    )
    db_session.add(bicarbonato)
    db_session.commit()
    bicarbonato_id = bicarbonato.id
    datos = datos_version(unidades, ingredientes)
    datos["renglones"].append(
        {"insumo_id": bicarbonato_id, "tipo": "aditivo", "cantidad": 10, "unidad_medida_id": unidades["g"].id}
    )
    receta = crear_receta(client, headers_administradora, nuevo_producto("Galletas"), datos)
    version_id = receta["version_vigente"]["id"]
    sin_marca = filas(informacion(client, headers_administradora, version_id))["sodio"]["por_100"]["calculado"]

    client.put(f"/insumos/{bicarbonato_id}", headers=headers_administradora, json={"aporta_energia_sodio": True})
    pendiente = informacion(client, headers_administradora, version_id)
    cargar_valores(client, headers_administradora, bicarbonato_id, {"energia": 0, "sodio": 27000})
    con_marca = filas(informacion(client, headers_administradora, version_id))["sodio"]["por_100"]["calculado"]

    assert sin_marca == pytest.approx(517.933, abs=1e-2)
    assert pendiente["completa"] is False and any("Bicarbonato" in f["mensaje"] for f in pendiente["faltantes"])
    assert con_marca == pytest.approx(517.933 + 2700 * 100 / 1500, abs=1e-2)


def test_version_inexistente_da_404(client, headers_administradora):
    assert client.get("/nutricion/versiones/9999", headers=headers_administradora).status_code == 404

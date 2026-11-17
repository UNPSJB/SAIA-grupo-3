import pytest

from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from tests.nutricion.utilidades import crear_receta, datos_version
from tests.rotulo.test_borrador import crear, datos_desde, faltantes, guardar, ruta


def confirmar(client, headers, producto_id, codigo=200):
    respuesta = client.post(f"{ruta(producto_id)}/alergenos/confirmar", headers=headers)
    assert respuesta.status_code == codigo, respuesta.text
    return respuesta.json()


def leer(client, headers, producto_id):
    respuesta = client.get(ruta(producto_id), headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def marcar(client, headers, insumo, *alergenos, gluten=False):
    respuesta = client.put(
        f"/insumos/{insumo.id}",
        headers=headers,
        json={"alergeno_ids": [a.id for a in alergenos], "contiene_gluten": gluten},
    )
    assert respuesta.status_code == 200, respuesta.text


@pytest.fixture
def huevo(db_session, unidades):
    insumo = Insumo(nombre="Huevo", unidad_medida_id=unidades["g"].id, tipo=TipoInsumo.INGREDIENTE, activo=True)
    db_session.add(insumo)
    db_session.commit()
    return insumo


def renglones(unidades, *insumos):
    return [
        {"insumo_id": insumo.id, "tipo": "ingrediente", "cantidad": cantidad, "unidad_medida_id": unidades["g"].id}
        for insumo, cantidad in insumos
    ]


@pytest.fixture
def budin(client, headers_administradora, unidades, ingredientes, huevo, nuevo_producto, alergenos_caa):
    harina = ingredientes["Harina de trigo 000"]
    marcar(client, headers_administradora, harina, alergenos_caa["Trigo"], gluten=True)
    marcar(client, headers_administradora, huevo, alergenos_caa["Huevo"])
    datos = datos_version(unidades, ingredientes)
    datos["renglones"] = renglones(unidades, (harina, 500), (huevo, 150), (ingredientes["Agua"], 200))
    receta = crear_receta(client, headers_administradora, nuevo_producto("Budín"), datos)
    producto_id = receta["producto"]["id"]
    crear(client, headers_administradora, producto_id)
    return {"producto_id": producto_id, "receta": receta, "datos": datos, "harina": harina, "huevo": huevo}


def test_una_receta_con_harina_de_trigo_y_huevo_propone_gluten_y_huevo(client, headers_administradora, budin):
    declaracion = leer(client, headers_administradora, budin["producto_id"])["alergenos"]

    assert declaracion["estado"] == "sugerida"
    assert [a["nombre"] for a in declaracion["contiene"]] == ["Trigo", "Huevo"]
    causas = {a["nombre"]: [c["nombre"] for c in a["causas"]] for a in declaracion["contiene"]}
    assert causas == {"Trigo": ["Harina de trigo 000"], "Huevo": ["Huevo"]}
    assert declaracion["contiene_gluten"] is True
    assert [c["nombre"] for c in declaracion["causas_gluten"]] == ["Harina de trigo 000"]
    assert declaracion["texto_contiene"] == "CONTIENE TRIGO Y HUEVO."
    assert declaracion["version_receta_numero"] == 1
    assert declaracion["advertencias"] == []


def test_la_declaracion_nueva_queda_sugerida_hasta_que_se_confirma(
    client, headers_administradora, budin, alergenos_caa, persona_administradora
):
    producto_id = budin["producto_id"]
    borrador = leer(client, headers_administradora, producto_id)
    assert "alergenos" in faltantes(borrador)

    guardado = guardar(
        client, headers_administradora, producto_id,
        datos_desde(
            borrador,
            puede_contener_ids=[alergenos_caa["Maní"].id],
            conservacion_condicion="refrigerado",
            conservacion_temp_min=0,
            conservacion_temp_max=5,
            conservacion_duracion_cantidad=7,
            conservacion_abierto="Consumir dentro de las 48 h",
        ),
    )
    assert guardado["alergenos"]["estado"] == "sugerida"
    assert guardado["alergenos"]["texto_puede_contener"] == "PUEDE CONTENER MANÍ."
    assert guardado["leyenda_conservacion"] == (
        "Conservar refrigerado entre 0 °C y 5 °C. Duración en estas condiciones: 7 días. "
        "Una vez abierto: consumir dentro de las 48 h."
    )
    assert "conservacion_condicion" not in faltantes(guardado)

    confirmado = confirmar(client, headers_administradora, producto_id)

    assert confirmado["alergenos"]["estado"] == "confirmada"
    assert confirmado["alergenos"]["confirmado_por"]["id"] == persona_administradora.id
    assert confirmado["alergenos"]["confirmado_en"] is not None
    assert "alergenos" not in faltantes(confirmado)
    assert leer(client, headers_administradora, producto_id)["alergenos"]["estado"] == "confirmada"


def test_quien_tiene_permiso_de_operar_no_puede_confirmar(client, headers_operadora, headers_administradora, budin):
    producto_id = budin["producto_id"]

    confirmar(client, headers_operadora, producto_id, codigo=403)

    assert leer(client, headers_administradora, producto_id)["alergenos"]["estado"] == "sugerida"


def test_cambiar_la_receta_vuelve_la_declaracion_a_sugerida(
    client, headers_administradora, budin, unidades, ingredientes
):
    producto_id = budin["producto_id"]
    confirmar(client, headers_administradora, producto_id)
    receta = budin["receta"]
    nueva = {
        **budin["datos"],
        "renglones": renglones(unidades, (budin["harina"], 550), (ingredientes["Agua"], 250)),
        "version_base_id": receta["version_vigente"]["id"],
        "motivo": "Versión sin huevo",
    }
    respuesta = client.post(f"/recetas/{receta['id']}/versiones", headers=headers_administradora, json=nueva)
    assert respuesta.status_code == 200, respuesta.text

    declaracion = leer(client, headers_administradora, producto_id)["alergenos"]

    assert declaracion["estado"] == "sugerida"
    assert "v1 → v2" in declaracion["aviso"]
    assert declaracion["confirmado_por"] is None
    assert [a["nombre"] for a in declaracion["contiene"]] == ["Trigo"]

    reconfirmada = confirmar(client, headers_administradora, producto_id)["alergenos"]
    assert reconfirmada["estado"] == "confirmada" and reconfirmada["aviso"] is None


def test_cambiar_las_marcas_de_un_ingrediente_vuelve_la_declaracion_a_sugerida(
    client, headers_administradora, budin, alergenos_caa
):
    producto_id = budin["producto_id"]
    confirmar(client, headers_administradora, producto_id)

    marcar(client, headers_administradora, budin["huevo"], alergenos_caa["Huevo"], alergenos_caa["Leche"])
    declaracion = leer(client, headers_administradora, producto_id)["alergenos"]

    assert declaracion["estado"] == "sugerida"
    assert "marcas de alérgenos" in declaracion["aviso"]
    assert declaracion["texto_contiene"] == "CONTIENE TRIGO, HUEVO Y LECHE."


def test_modificar_la_contaminacion_cruzada_obliga_a_confirmar_de_nuevo(
    client, headers_administradora, budin, alergenos_caa
):
    producto_id = budin["producto_id"]
    confirmado = confirmar(client, headers_administradora, producto_id)

    mismo = guardar(client, headers_administradora, producto_id, datos_desde(confirmado, razon_social="El Trigal"))
    assert mismo["alergenos"]["estado"] == "confirmada"

    cambiado = guardar(
        client, headers_administradora, producto_id,
        datos_desde(mismo, puede_contener_ids=[alergenos_caa["Soja"].id, alergenos_caa["Huevo"].id]),
    )

    assert cambiado["alergenos"]["estado"] == "sugerida"
    assert [a["nombre"] for a in cambiado["alergenos"]["puede_contener"]] == ["Soja"]


def test_un_insumo_con_gluten_sin_cereal_avisa(client, headers_administradora, budin):
    marcar(client, headers_administradora, budin["harina"], gluten=True)

    declaracion = leer(client, headers_administradora, budin["producto_id"])["alergenos"]

    assert declaracion["contiene_gluten"] is True
    assert [a["nombre"] for a in declaracion["contiene"]] == ["Huevo"]
    assert declaracion["advertencias"]


def test_sin_receta_vigente_no_se_puede_confirmar(client, headers_administradora, nuevo_producto, alergenos_caa):
    producto_id = nuevo_producto("Producto sin receta")
    borrador = crear(client, headers_administradora, producto_id)

    assert borrador["alergenos"]["contiene"] == []
    confirmar(client, headers_administradora, producto_id, codigo=400)


def test_la_conservacion_valida_las_temperaturas(client, headers_administradora, budin):
    producto_id = budin["producto_id"]
    borrador = leer(client, headers_administradora, producto_id)

    invertidas = client.put(
        ruta(producto_id), headers=headers_administradora,
        json=datos_desde(borrador, conservacion_condicion="refrigerado", conservacion_temp_min=8, conservacion_temp_max=2),
    )
    sin_condicion = client.put(
        ruta(producto_id), headers=headers_administradora,
        json=datos_desde(borrador, conservacion_duracion_cantidad=3),
    )
    congelado = guardar(
        client, headers_administradora, producto_id,
        datos_desde(borrador, conservacion_condicion="congelado", conservacion_temp_max=-18,
                    conservacion_duracion_cantidad=3, conservacion_duracion_unidad="meses"),
    )

    assert invertidas.status_code == 422
    assert sin_condicion.status_code == 422
    assert congelado["leyenda_conservacion"] == "Conservar congelado a -18 °C o menos. Duración en estas condiciones: 3 meses."

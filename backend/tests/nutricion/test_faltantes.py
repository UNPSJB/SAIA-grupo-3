from datetime import datetime

from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.nutricion.constants import FuenteNutricional, Nutriente
from src.nutricion.models import InformacionNutricionalVersion, ValorNutricionalInsumo
from tests.nutricion.utilidades import (
    REFERENCIA,
    cargar_referencia,
    cargar_valores,
    crear_receta,
    datos_version,
    filas,
    informacion,
)

TODOS = [n.value for n in Nutriente]


def agregar_renglon(datos, insumo_id, unidades, cantidad=10, tipo="ingrediente"):
    datos["renglones"].append(
        {"insumo_id": insumo_id, "tipo": tipo, "cantidad": cantidad, "unidad_medida_id": unidades["g"].id}
    )
    return datos


def nuevo_ingrediente(db_session, unidades, nombre="Semillas de chía"):
    insumo = Insumo(nombre=nombre, unidad_medida_id=unidades["g"].id, tipo=TipoInsumo.INGREDIENTE, activo=True)
    db_session.add(insumo)
    db_session.commit()
    return insumo.id


def faltantes_de_insumos(info):
    return {f["insumo"]["nombre"]: f for f in info["faltantes"] if f["tipo"] == "insumo"}


def test_un_ingrediente_sin_datos_marca_la_tabla_incompleta_y_figura_en_la_lista(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, db_session
):
    cargar_referencia(client, headers_administradora, ingredientes)
    chia = nuevo_ingrediente(db_session, unidades)
    datos = agregar_renglon(datos_version(unidades, ingredientes), chia, unidades)
    receta = crear_receta(client, headers_administradora, nuevo_producto("Pan con chía"), datos)

    info = informacion(client, headers_administradora, receta["version_vigente"]["id"])
    faltante = faltantes_de_insumos(info)["Semillas de chía"]

    assert info["completa"] is False
    assert faltante["insumo"] == {"id": chia, "nombre": "Semillas de chía", "tipo": "ingrediente"}
    assert faltante["nutrientes"] == TODOS and faltante["sin_fuente"] == []
    assert "no tiene cargado" in faltante["mensaje"]
    assert receta["version_vigente"]["informacion_nutricional_completa"] is False


def test_un_dato_sin_fuente_cuenta_como_faltante(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, db_session, persona_administradora
):
    cargar_referencia(client, headers_administradora, ingredientes)
    harina = db_session.get(Insumo, ingredientes["Harina de trigo 000"].id)
    fila = db_session.query(ValorNutricionalInsumo).filter_by(insumo_id=harina.id, nutriente=Nutriente.SODIO).one()
    fila.detalle_fuente = None
    sin_alimento = ValorNutricionalInsumo(
        insumo_id=ingredientes["Agua"].id,
        nutriente=Nutriente.ENERGIA,
        valor=0,
        fuente=FuenteNutricional.BASE_REFERENCIA,
        valor_fuente=0,
        cargado_por_id=persona_administradora.id,
        cargado_en=datetime.now(),
    )
    db_session.query(ValorNutricionalInsumo).filter_by(insumo_id=ingredientes["Agua"].id, nutriente=Nutriente.ENERGIA).delete()
    db_session.add(sin_alimento)
    db_session.commit()

    receta = crear_receta(client, headers_administradora, nuevo_producto("Pan"), datos_version(unidades, ingredientes))
    info = informacion(client, headers_administradora, receta["version_vigente"]["id"])
    faltantes = faltantes_de_insumos(info)
    datos_harina = client.get(f"/nutricion/insumos/{harina.id}", headers=headers_administradora).json()

    assert info["completa"] is False
    assert faltantes["Harina de trigo 000"]["sin_fuente"] == ["sodio"]
    assert faltantes["Harina de trigo 000"]["nutrientes"] == []
    assert "sin fuente registrada: sodio" in faltantes["Harina de trigo 000"]["mensaje"]
    assert faltantes["Agua"]["sin_fuente"] == ["energia"]
    assert filas(info)["sodio"]["por_100"]["calculado"] > 0
    assert datos_harina["sin_fuente"] == ["sodio"]
    assert [v["nutriente"] for v in datos_harina["valores"] if v["sin_fuente"]] == ["sodio"]


def test_un_aditivo_sin_datos_y_sin_marca_de_aporte_no_cuenta(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, leudante
):
    cargar_referencia(client, headers_administradora, ingredientes)
    datos = agregar_renglon(datos_version(unidades, ingredientes), leudante.id, unidades, tipo="aditivo")
    receta = crear_receta(client, headers_administradora, nuevo_producto("Galletas"), datos)

    info = informacion(client, headers_administradora, receta["version_vigente"]["id"])

    assert info["completa"] is True and info["faltantes"] == []


def test_un_aditivo_con_marca_de_aporte_y_sin_sodio_si_cuenta(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, leudante
):
    cargar_referencia(client, headers_administradora, ingredientes)
    client.put(f"/insumos/{leudante.id}", headers=headers_administradora, json={"aporta_energia_sodio": True})
    cargar_valores(client, headers_administradora, leudante.id, {"energia": 0})
    datos = agregar_renglon(datos_version(unidades, ingredientes), leudante.id, unidades, tipo="aditivo")
    receta = crear_receta(client, headers_administradora, nuevo_producto("Galletas"), datos)

    info = informacion(client, headers_administradora, receta["version_vigente"]["id"])
    faltante = faltantes_de_insumos(info)["Bicarbonato de sodio"]

    assert info["completa"] is False
    assert faltante["insumo"]["tipo"] == "aditivo"
    assert faltante["nutrientes"] == ["sodio"]
    assert filas(info)["sodio"]["por_100"] is None
    assert filas(info)["energia"]["por_100"] is not None


def test_al_completar_el_ultimo_dato_la_tabla_pasa_a_completa(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, db_session
):
    cargar_referencia(client, headers_administradora, ingredientes)
    chia = nuevo_ingrediente(db_session, unidades)
    datos = agregar_renglon(datos_version(unidades, ingredientes), chia, unidades, cantidad=50)
    receta = crear_receta(client, headers_administradora, nuevo_producto("Pan con chía"), datos)
    version_id = receta["version_vigente"]["id"]
    valores = dict(REFERENCIA["ingredientes"][0]["valores_por_100g"])

    cargar_valores(client, headers_administradora, chia, {k: v for k, v in valores.items() if k != "fibra"})
    casi = informacion(client, headers_administradora, version_id)
    cargar_valores(client, headers_administradora, chia, {"fibra": 34})
    completa = informacion(client, headers_administradora, version_id)
    receta_actual = client.get(f"/recetas/{receta['id']}", headers=headers_administradora).json()

    assert casi["completa"] is False and faltantes_de_insumos(casi)["Semillas de chía"]["nutrientes"] == ["fibra"]
    assert completa["completa"] is True and completa["faltantes"] == []
    assert filas(casi)["fibra"]["por_100"] is None
    assert filas(completa)["fibra"]["por_100"]["calculado"] > 0
    assert receta_actual["version_vigente"]["informacion_nutricional_completa"] is True


def test_registrar_la_fuente_completa_el_dato_sin_cambiar_el_valor(
    client, headers_administradora, unidades, ingredientes, nuevo_producto, db_session
):
    cargar_referencia(client, headers_administradora, ingredientes)
    harina_id = ingredientes["Harina de trigo 000"].id
    fila = db_session.query(ValorNutricionalInsumo).filter_by(insumo_id=harina_id, nutriente=Nutriente.SODIO).one()
    fila.detalle_fuente = "  "
    db_session.commit()
    receta = crear_receta(client, headers_administradora, nuevo_producto("Pan"), datos_version(unidades, ingredientes))
    version_id = receta["version_vigente"]["id"]
    antes = informacion(client, headers_administradora, version_id)

    sin_detalle = client.patch(
        f"/nutricion/insumos/{harina_id}/fuente",
        headers=headers_administradora,
        json={"nutrientes": ["sodio"], "fuente": "rotulo_proveedor", "detalle_fuente": " "},
    )
    base = client.patch(
        f"/nutricion/insumos/{harina_id}/fuente",
        headers=headers_administradora,
        json={"nutrientes": ["sodio"], "fuente": "base_referencia", "detalle_fuente": "SARA"},
    )
    registrada = client.patch(
        f"/nutricion/insumos/{harina_id}/fuente",
        headers=headers_administradora,
        json={"nutrientes": ["sodio"], "fuente": "rotulo_proveedor", "detalle_fuente": "Molino X, rótulo 2026"},
    )
    despues = informacion(client, headers_administradora, version_id)
    historial = client.get(f"/nutricion/insumos/{harina_id}/historial", headers=headers_administradora).json()
    sodio = next(v for v in registrada.json()["valores"] if v["nutriente"] == "sodio")

    assert antes["completa"] is False
    assert sin_detalle.status_code == 422 and base.status_code == 422
    assert registrada.status_code == 200, registrada.text
    assert (sodio["valor"], sodio["fuente"], sodio["sin_fuente"]) == (2, "rotulo_proveedor", False)
    assert despues["completa"] is True
    assert historial[0]["accion"] == "registro_fuente"
    assert filas(despues)["sodio"]["por_100"]["calculado"] == filas(antes)["sodio"]["por_100"]["calculado"]


def test_la_carga_manual_exige_el_detalle_de_la_fuente(client, headers_administradora, insumo_activo):
    respuesta = client.put(
        f"/nutricion/insumos/{insumo_activo.id}",
        headers=headers_administradora,
        json={"fuente": "valor_propio", "detalle_fuente": "   ", "valores": {"energia": 100}},
    )

    assert respuesta.status_code == 422
    assert "detalle de la fuente" in respuesta.text


def test_los_problemas_de_la_receta_tambien_se_listan_con_su_tipo(
    client, headers_administradora, unidades, ingredientes, nuevo_producto
):
    cargar_referencia(client, headers_administradora, ingredientes)
    receta = crear_receta(
        client, headers_administradora, nuevo_producto("Pancitos"),
        datos_version(unidades, ingredientes, rendimiento=30, unidad="un", porcion=50, porcion_unidad="g"),
    )

    info = informacion(client, headers_administradora, receta["version_vigente"]["id"])

    assert [f["tipo"] for f in info["faltantes"]] == ["rendimiento"]
    assert info["faltantes"][0]["insumo"] is None


def test_un_resultado_guardado_con_el_formato_anterior_se_recalcula_con_el_detalle(
    client, headers_administradora, receta_referencia_incompleta, db_session
):
    version_id = receta_referencia_incompleta
    guardado = db_session.query(InformacionNutricionalVersion).filter_by(version_id=version_id).one()
    guardado.faltantes = ["'Semillas' no tiene cargado: fibra alimentaria."]
    db_session.commit()

    info = informacion(client, headers_administradora, version_id)

    assert [f["tipo"] for f in info["faltantes"]] == ["insumo"]
    assert info["faltantes"][0]["insumo"]["nombre"] == "Semillas"

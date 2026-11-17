from datetime import date

from src.config import settings
from src.receta.models import VersionReceta
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida

COMPLETO = {
    "denominacion_venta": "Pan casero",
    "contenido_neto": 500,
    "razon_social": "Panificadora El Trigal S.R.L.",
    "domicilio": "Av. Siempre Viva 123, Luján, Buenos Aires",
    "pais_origen": "Argentina",
    "tipo_registro": "rppa",
    "numero_registro": "02-123456",
    "numero_establecimiento": "02-000123",
    "vida_util_cantidad": 5,
    "vida_util_unidad": "dias",
    "conservacion_condicion": "ambiente",
}


def ruta(producto_id):
    return f"/rotulos/productos/{producto_id}"


def crear(client, headers, producto_id):
    respuesta = client.post(ruta(producto_id), headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def datos_desde(borrador, **cambios):
    campos = (
        "denominacion_venta", "lista_ingredientes", "identificacion_lote", "contenido_neto", "razon_social",
        "domicilio", "pais_origen", "tipo_registro", "numero_registro", "numero_establecimiento", "es_importado",
        "importador_razon_social", "importador_domicilio", "vida_util_cantidad", "vida_util_unidad",
        "leyenda_duracion", "requiere_instrucciones", "instrucciones", "conservacion_condicion",
        "conservacion_temp_min", "conservacion_temp_max", "conservacion_duracion_cantidad",
        "conservacion_duracion_unidad", "conservacion_abierto",
    )
    datos = {campo: borrador[campo] for campo in campos}
    datos["puede_contener_ids"] = [a["id"] for a in borrador["alergenos"]["puede_contener"]]
    unidad = borrador["contenido_neto_unidad"]
    datos["contenido_neto_unidad_id"] = unidad["id"] if unidad else None
    datos.update(cambios)
    return datos


def guardar(client, headers, producto_id, datos, codigo=200):
    respuesta = client.put(ruta(producto_id), headers=headers, json=datos)
    assert respuesta.status_code == codigo, respuesta.text
    return respuesta.json()


def automatico(borrador, campo):
    return next(a for a in borrador["automaticos"] if a["campo"] == campo)


def faltantes(borrador):
    return [f["campo"] for f in borrador["completitud"]["faltantes"]]


def test_un_borrador_nuevo_trae_la_lista_de_ingredientes_y_la_tabla_de_la_receta_vigente(
    client, headers_administradora, producto_id
):
    borrador = crear(client, headers_administradora, producto_id)
    lista = automatico(borrador, "lista_ingredientes")

    assert borrador["lista_ingredientes"].startswith("Ingredientes: Harina de trigo 000, Agua")
    assert lista["origen"] == "de la receta v1" and lista["editado"] is False
    assert automatico(borrador, "denominacion_venta")["valor"] == "Pan casero"
    assert automatico(borrador, "denominacion_venta")["origen"] == "del producto"
    assert borrador["informacion_nutricional"]["numero"] == 1
    assert borrador["informacion_nutricional"]["completa"] is True
    assert borrador["pais_origen"] == "Argentina"
    assert borrador["leyenda_duracion"] == "Consumir preferentemente antes del"


def test_se_puede_guardar_con_faltantes_y_la_completitud_los_informa(
    client, headers_administradora, producto_id, unidades, nuevo_lote, monkeypatch
):
    borrador = crear(client, headers_administradora, producto_id)
    parcial = guardar(client, headers_administradora, producto_id, datos_desde(borrador, razon_social="El Trigal"))

    assert parcial["razon_social"] == "El Trigal"
    assert {"contenido_neto", "domicilio", "numero_registro", "identificacion_lote", "vida_util_cantidad"} <= set(
        faltantes(parcial)
    )
    assert "importador_razon_social" not in faltantes(parcial)
    assert 0 < parcial["completitud"]["porcentaje"] < 100
    assert parcial["completitud"]["faltantes"][0]["seccion"]

    monkeypatch.setattr(settings, "ROTULADO_FRONTAL_ACTIVO", False)
    nuevo_lote(producto_id, "L-2026-001", date(2026, 11, 1))
    confirmada = client.post(f"{ruta(producto_id)}/alergenos/confirmar", headers=headers_administradora)
    assert confirmada.status_code == 200, confirmada.text
    completo = guardar(
        client, headers_administradora, producto_id,
        datos_desde(client.get(ruta(producto_id), headers=headers_administradora).json(),
                    contenido_neto_unidad_id=unidades["g"].id, **COMPLETO),
    )

    assert completo["identificacion_lote"] == "L-2026-001"
    assert completo["completitud"]["faltantes"] == []
    assert completo["completitud"]["porcentaje"] == 100
    assert completo["rotulado_frontal"] is None


def test_con_el_modulo_de_octogonos_activo_el_rotulado_frontal_es_obligatorio(
    client, headers_administradora, producto_id
):
    borrador = crear(client, headers_administradora, producto_id)

    assert "rotulado_frontal" in faltantes(borrador)
    assert borrador["rotulado_frontal"]["resultado"] is None


def test_editar_un_dato_automatico_deja_la_constancia(
    client, headers_administradora, persona_administradora, producto_id
):
    borrador = crear(client, headers_administradora, producto_id)
    original = borrador["lista_ingredientes"]
    nueva_lista = "Ingredientes: harina de trigo enriquecida (Ley 25.630), agua, sal, levadura, aceite, azúcar."

    editado = guardar(client, headers_administradora, producto_id, datos_desde(borrador, lista_ingredientes=nueva_lista))
    lista = automatico(editado, "lista_ingredientes")
    edicion = editado["ediciones"][0]

    assert editado["lista_ingredientes"] == nueva_lista
    assert lista["editado"] is True and lista["valor_sistema"] == original
    assert lista["editado_por"]["id"] == persona_administradora.id and lista["editado_en"]
    assert (edicion["campo"], edicion["valor_original"], edicion["valor_nuevo"]) == (
        "lista_ingredientes", original, nueva_lista
    )
    assert edicion["valor_sistema"] == original and edicion["origen"] == "de la receta v1"
    assert edicion["personal"]["id"] == persona_administradora.id and edicion["fecha_hora"]

    restaurado = guardar(client, headers_administradora, producto_id, datos_desde(editado, lista_ingredientes=original))

    assert automatico(restaurado, "lista_ingredientes")["editado"] is False
    assert len(restaurado["ediciones"]) == 2 and restaurado["ediciones"][0]["valor_nuevo"] == original


def test_el_importador_solo_se_exige_si_el_producto_es_importado(client, headers_administradora, producto_id):
    borrador = crear(client, headers_administradora, producto_id)

    nacional = guardar(client, headers_administradora, producto_id, datos_desde(borrador, importador_razon_social="X"))
    importado = guardar(client, headers_administradora, producto_id, datos_desde(borrador, es_importado=True))
    con_importador = guardar(
        client, headers_administradora, producto_id,
        datos_desde(borrador, es_importado=True, importador_razon_social="Importadora Sur S.A.",
                    importador_domicilio="Calle 1, CABA"),
    )

    assert nacional["importador_razon_social"] is None
    assert "importador_razon_social" not in faltantes(nacional)
    assert {"importador_razon_social", "importador_domicilio"} <= set(faltantes(importado))
    assert "importador_razon_social" not in faltantes(con_importador)
    assert con_importador["importador_domicilio"] == "Calle 1, CABA"


def test_el_lote_se_completa_con_el_ultimo_y_avisa_si_cambia_despues_de_editarlo(
    client, headers_administradora, producto_id, nuevo_lote
):
    borrador = crear(client, headers_administradora, producto_id)
    nuevo_lote(producto_id, "L-001", date(2026, 10, 1))
    con_lote = client.get(ruta(producto_id), headers=headers_administradora).json()
    editado = guardar(client, headers_administradora, producto_id, datos_desde(con_lote, identificacion_lote="Ver envase"))
    nuevo_lote(producto_id, "L-002", date(2026, 11, 1))
    despues = client.get(ruta(producto_id), headers=headers_administradora).json()

    assert automatico(borrador, "identificacion_lote")["origen"] == "sin lotes registrados"
    assert con_lote["identificacion_lote"] == "L-001"
    assert automatico(con_lote, "identificacion_lote")["origen"] == "del lote L-001"
    assert automatico(editado, "identificacion_lote")["editado"] is True
    assert despues["identificacion_lote"] == "Ver envase"
    lote = automatico(despues, "identificacion_lote")
    assert lote["cambio_en_sistema"] is True and lote["valor_sistema"] == "L-002"


def test_el_contenido_neto_va_en_unidad_de_peso_o_volumen(client, headers_administradora, producto_id, db_session):
    unidad = UnidadMedida(tipo=TipoUnidadMedida.UNIDAD, sufijo="un", activo=True, factor_base=1)
    db_session.add(unidad)
    db_session.commit()
    borrador = crear(client, headers_administradora, producto_id)

    respuesta = guardar(
        client, headers_administradora, producto_id,
        datos_desde(borrador, contenido_neto=6, contenido_neto_unidad_id=unidad.id), codigo=400,
    )

    assert "peso o de volumen" in respuesta["detail"]


def test_un_borrador_por_producto_y_solo_quien_administra(
    client, headers_administradora, headers_operadora, producto_id
):
    sin_borrador = client.get(ruta(producto_id), headers=headers_administradora)
    crear(client, headers_administradora, producto_id)
    otra_vez = client.post(ruta(producto_id), headers=headers_administradora)

    assert sin_borrador.status_code == 404
    assert otra_vez.status_code == 400
    assert client.get(ruta(producto_id), headers=headers_operadora).status_code == 403
    assert client.put(ruta(producto_id), headers=headers_operadora, json={}).status_code == 403


def test_una_receta_incompleta_deja_la_informacion_nutricional_como_faltante(
    client, headers_administradora, receta_referencia_incompleta, db_session
):
    producto_id = db_session.get(VersionReceta, receta_referencia_incompleta).receta.producto_id
    borrador = crear(client, headers_administradora, producto_id)

    assert borrador["informacion_nutricional"]["completa"] is False
    assert "informacion_nutricional" in faltantes(borrador)


def test_el_listado_muestra_los_productos_con_y_sin_borrador(
    client, headers_administradora, producto_id, nuevo_producto
):
    otro = nuevo_producto("Grisines")
    crear(client, headers_administradora, producto_id)

    listado = {r["producto"]["id"]: r for r in client.get("/rotulos/", headers=headers_administradora).json()}

    assert listado[producto_id]["borrador_id"] is not None and listado[producto_id]["porcentaje"] < 100
    assert listado[otro]["borrador_id"] is None and listado[otro]["porcentaje"] is None

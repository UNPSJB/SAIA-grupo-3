import json
from pathlib import Path

REFERENCIA = json.loads((Path(__file__).parent / "datos" / "producto_referencia.json").read_text(encoding="utf-8"))
NUTRIENTES = list(REFERENCIA["esperado_por_100g"])


def cargar_valores(client, headers, insumo_id, valores):
    respuesta = client.put(
        f"/nutricion/insumos/{insumo_id}",
        headers=headers,
        json={"fuente": "bibliografia", "detalle_fuente": "Prueba", "valores": valores},
    )
    assert respuesta.status_code == 200, respuesta.text


def cargar_referencia(client, headers, ingredientes):
    for ingrediente in REFERENCIA["ingredientes"]:
        cargar_valores(client, headers, ingredientes[ingrediente["nombre"]].id, ingrediente["valores_por_100g"])


def datos_version(unidades, ingredientes, rendimiento=None, unidad="g", porcion=None, porcion_unidad="g", **extra):
    return {
        "rendimiento_cantidad": rendimiento or REFERENCIA["rendimiento_g"],
        "rendimiento_unidad_id": unidades[unidad].id,
        "porcion_cantidad": porcion if porcion is not None else REFERENCIA["porcion_g"],
        "porcion_unidad_id": unidades[porcion_unidad].id,
        "porcion_medida_casera": "1 rebanada",
        "renglones": [
            {
                "insumo_id": ingredientes[i["nombre"]].id,
                "tipo": "ingrediente",
                "cantidad": i["cantidad_g"],
                "unidad_medida_id": unidades["g"].id,
            }
            for i in REFERENCIA["ingredientes"]
        ],
        **extra,
    }


def crear_receta(client, headers, producto_id, datos):
    respuesta = client.post("/recetas/", headers=headers, json={"producto_id": producto_id, **datos})
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def informacion(client, headers, version_id):
    respuesta = client.get(f"/nutricion/versiones/{version_id}", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def filas(info):
    return {fila["nutriente"]: fila for fila in info["filas"]}


def dentro_de_tolerancia(calculado, esperado):
    tolerancia = REFERENCIA["tolerancia"]
    return abs(calculado - esperado) <= max(tolerancia["absoluta"], abs(esperado) * tolerancia["relativa"])

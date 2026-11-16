CAMPOS_UMBRAL = (
    "sello",
    "leyenda",
    "nutriente",
    "formula",
    "factor_energetico",
    "limite",
    "unidad",
    "comparacion",
    "aplica_a",
    "requiere_agregado",
    "requiere_alguno_de",
    "energia_maxima_porcion",
    "nota",
)


def conjunto(client, headers, conjunto_id):
    respuesta = client.get(f"/rotulado-frontal/parametros/{conjunto_id}", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def datos_editables(conjunto_json):
    return {
        "nombre": conjunto_json["nombre"],
        "norma_origen": conjunto_json["norma_origen"],
        "fecha_vigencia": conjunto_json["fecha_vigencia"],
        "motivo": conjunto_json["motivo"],
        "umbrales": [{k: u[k] for k in CAMPOS_UMBRAL} for u in conjunto_json["umbrales"]],
        "reglas": [{k: r[k] for k in ("operador", "hechos", "resultado", "mensaje")} for r in conjunto_json["reglas"]],
        "advertencias": [{k: a[k] for k in ("hecho", "texto")} for a in conjunto_json["advertencias"]],
    }


def nueva_version(client, headers, motivo="Actualización normativa", **extra):
    respuesta = client.post("/rotulado-frontal/parametros", headers=headers, json={"motivo": motivo, **extra})
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def probar(client, headers, entrada, conjunto_id=None):
    params = {"conjunto_id": conjunto_id} if conjunto_id else {}
    respuesta = client.post("/rotulado-frontal/parametros/probar", headers=headers, json=entrada, params=params)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


GALLETITA = {
    "tipo": "solido",
    "por_100": {"energia": 450, "azucares_anadidos": 10.8, "grasas_totales": 14, "grasas_saturadas": 6, "sodio": 380},
    "hechos": ["envasado_ausencia_cliente", "agrega_azucares", "agrega_grasas", "agrega_sodio"],
}

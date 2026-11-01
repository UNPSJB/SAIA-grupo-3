"""Productos químicos de limpieza."""

from scripts.seed_common import CANTIDAD
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico


QUIMICOS = ["Detergente neutro para vajilla", "Detergente alcalino para hornos", "Desinfectante clorado",
    "Sanitizante de amonio cuaternario", "Alcohol etílico al 70 %", "Desengrasante de cocina",
    "Limpiador de acero inoxidable", "Detergente para lavavajillas", "Abrillantador de vajilla",
    "Desincrustante ácido", "Jabón líquido para manos", "Limpiador de pisos",
    "Desinfectante para superficies", "Sanitizante de vegetales", "Detergente espumante"]

def cargar_insumos_quimicos(crear, unidades_por_sufijo):
    quimicos = []
    litro = unidades_por_sufijo["L"]
    tipos_quimico = list(TipoQuimico)
    for i in range(CANTIDAD):
        # Clasificaciones correspondientes a los nombres comerciales genéricos.
        nombre_tipo = "desinfectante" if i in (2, 3, 4, 12, 13) else "detergente" if i in (0, 1, 7, 10, 14) else "desengrasante" if i == 5 else "otro"
        tipo = next((t for t in tipos_quimico if t.value == nombre_tipo), tipos_quimico[-1])
        quimico, _ = crear(InsumoQuimico, {"nombre": QUIMICOS[i]}, cantidad=100.0 + i * 5,
            unidad_medida_id=litro.id, tipo_quimico=tipo, activo=True)
        quimicos.append(quimico)

    return quimicos

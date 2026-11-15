"""Alimentos de referencia DEMO y datos nutricionales de los ingredientes de prueba."""

from sqlalchemy import select

from scripts.seed_common import ASSETS_DIR
from src.nutricion.calculo import calcular_informacion
from src.nutricion.constants import AccionHistorial, FuenteNutricional
from src.nutricion.informacion import asegurar_configuracion
from src.nutricion.models import AlimentoReferencia, ValorNutricionalInsumo
from src.receta.models import VersionReceta
from src.unidadMedida.models import TipoUnidadMedida
from src.nutricion.services import cargar_valores, importar_csv, nutrientes_permitidos, valores_de_alimento

FUENTE_DEMO = "DEMO - valores de prueba"
ARCHIVO_DEMO = ASSETS_DIR / "alimentos_referencia_demo.csv"

REFERENCIAS = {
    "Harina de trigo": "DEMO-001",
    "Azúcar": "DEMO-004",
    "Agua": "DEMO-006",
    "Levadura": "DEMO-007",
    "Aceite": "DEMO-008",
    "Sal": "DEMO-010",
    "Tomate triturado": "DEMO-011",
    "Leche": "DEMO-012",
    "Carne vacuna": "DEMO-013",
    "Cebolla": "DEMO-014",
    "Verduras para tarta": "DEMO-015",
    "Papa": "DEMO-016",
    "Huevo": "DEMO-017",
}

ADITIVOS_CON_APORTE = {"Polvo de hornear (bicarbonato)": "DEMO-019"}

RENDIMIENTO_COCCION_DEMO = 0.88
RENDIMIENTO_SIN_COCCION_DEMO = {"Tapas de empanada": 0.98}


def _completar_peso_final(db):
    versiones = db.scalars(select(VersionReceta)).all()
    for version in versiones:
        if version.rendimiento_unidad.tipo != TipoUnidadMedida.UNIDAD or version.rendimiento_peso_g:
            continue
        if not version.composicion_total_gramos:
            continue
        factor = RENDIMIENTO_SIN_COCCION_DEMO.get(version.receta.producto.nombre, RENDIMIENTO_COCCION_DEMO)
        version.rendimiento_peso_g = round(version.composicion_total_gramos * factor, -1)
    return versiones


def cargar_nutricion(db, ingredientes, aditivos, admin):
    importar_csv(db, ARCHIVO_DEMO.read_text(encoding="utf-8"), FUENTE_DEMO, confirmar=False)
    alimentos = {
        alimento.codigo: alimento
        for alimento in db.scalars(select(AlimentoReferencia).where(AlimentoReferencia.fuente == FUENTE_DEMO))
    }
    for nombre, codigo in ADITIVOS_CON_APORTE.items():
        aditivos[nombre].aporta_energia_sodio = True
    insumos = [(ingredientes[n], c) for n, c in REFERENCIAS.items()]
    insumos += [(aditivos[n], c) for n, c in ADITIVOS_CON_APORTE.items()]
    for insumo, codigo in insumos:
        ya_cargado = db.scalar(
            select(ValorNutricionalInsumo.id).where(ValorNutricionalInsumo.insumo_id == insumo.id).limit(1)
        )
        if ya_cargado is not None:
            continue
        alimento = alimentos[codigo]
        permitidos = set(nutrientes_permitidos(insumo))
        valores = {n: v for n, v in valores_de_alimento(alimento).items() if n in permitidos}
        cargar_valores(
            db, insumo, valores, FuenteNutricional.BASE_REFERENCIA,
            f"{alimento.fuente} · {alimento.codigo} · {alimento.nombre}", alimento.id,
            AccionHistorial.COPIA_REFERENCIA, admin,
        )
    db.flush()
    asegurar_configuracion(db)
    for version in _completar_peso_final(db):
        calcular_informacion(db, version)
    db.flush()

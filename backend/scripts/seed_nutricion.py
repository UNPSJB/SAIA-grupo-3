"""Alimentos de referencia DEMO y datos nutricionales de los ingredientes de prueba."""

from sqlalchemy import select

from scripts.seed_common import ASSETS_DIR
from src.nutricion.constants import AccionHistorial, FuenteNutricional
from src.nutricion.models import AlimentoReferencia, ValorNutricionalInsumo
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

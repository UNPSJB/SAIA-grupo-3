from pathlib import Path

from src.nutricion import services
from src.nutricion.models import AlimentoReferencia

ARCHIVO_DEMO = Path(__file__).resolve().parents[2] / "seed_assets" / "alimentos_referencia_demo.csv"


def test_importa_el_archivo_de_ejemplo_con_punto_y_coma_y_coma_decimal(db_session):
    resultado = services.importar_csv(db_session, ARCHIVO_DEMO.read_text(encoding="utf-8"), "DEMO")

    assert (resultado.creados, resultado.errores) == (20, [])
    harina = db_session.query(AlimentoReferencia).filter_by(codigo="DEMO-001").one()
    assert (harina.carbohidratos_g, harina.azucares_totales_g, harina.fibra_g) == (72, 0.3, 2.7)


def test_valores_de_un_alimento_ignora_los_vacios(db_session, harina_referencia):
    valores = services.valores_de_alimento(harina_referencia)

    assert "azucares_anadidos" not in valores
    assert valores["sodio"] == 2

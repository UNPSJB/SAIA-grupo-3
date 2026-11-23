from datetime import date

import pytest

from src.loteProduccion import exceptions
from src.loteProduccion.codigo_barras import (
    calcular_control,
    generar_codigo_barras,
    validar_codigo_barras,
)


@pytest.mark.parametrize("codigo", ["3017620422003", "2026112200013", "2026112200020"])
def test_calcular_control_coincide_con_el_ultimo_digito(codigo):
    assert calcular_control(codigo[:12]) == int(codigo[12])


def test_generar_codigo_barras_arma_prefijo_fecha_numero_y_control():
    assert generar_codigo_barras(date(2026, 11, 22), 1) == "2026112200013"


def test_generar_codigo_barras_siempre_tiene_13_digitos():
    codigo = generar_codigo_barras(date(2026, 1, 5), 9999)
    assert len(codigo) == 13
    assert codigo.isdigit()


@pytest.mark.parametrize("numero", [0, 10000])
def test_generar_codigo_barras_rechaza_numeros_fuera_de_rango(numero):
    with pytest.raises(ValueError):
        generar_codigo_barras(date(2026, 11, 22), numero)


def test_validar_codigo_barras_acepta_un_codigo_generado():
    codigo = generar_codigo_barras(date(2026, 11, 22), 7)
    assert validar_codigo_barras(codigo) == codigo


@pytest.mark.parametrize("codigo", ["", "202611220001", "20261122000134", "20261122000a3", "L-20261122-001"])
def test_validar_codigo_barras_rechaza_formatos_invalidos(codigo):
    with pytest.raises(exceptions.CodigoFormatoInvalido):
        validar_codigo_barras(codigo)


def test_validar_codigo_barras_rechaza_otro_prefijo():
    with pytest.raises(exceptions.CodigoPrefijoInvalido):
        validar_codigo_barras("3017620422003")


def test_validar_codigo_barras_informa_digito_leido_y_esperado():
    with pytest.raises(exceptions.CodigoControlInvalido) as error:
        validar_codigo_barras("2026112200018")
    assert "se leyó 8 y se esperaba 3" in error.value.detail

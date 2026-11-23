import re
from datetime import date

from src.loteProduccion import exceptions
from src.loteProduccion.constants import PREFIJO_CODIGO_BARRAS

PATRON_CODIGO_BARRAS = re.compile(r"[0-9]{13}")


def calcular_control(cuerpo: str) -> int:
    suma = sum(
        int(digito) * (3 if posicion % 2 == 0 else 1)
        for posicion, digito in enumerate(reversed(cuerpo))
    )
    return (-suma) % 10


def generar_codigo_barras(fecha: date, numero: int) -> str:
    if not 1 <= numero <= 9999:
        raise ValueError("El número de lote del día debe estar entre 1 y 9999.")
    cuerpo = f"{PREFIJO_CODIGO_BARRAS}{fecha:%y%m%d}{numero:04d}"
    return f"{cuerpo}{calcular_control(cuerpo)}"


def validar_codigo_barras(codigo: str) -> str:
    if not PATRON_CODIGO_BARRAS.fullmatch(codigo):
        raise exceptions.CodigoFormatoInvalido()
    if not codigo.startswith(PREFIJO_CODIGO_BARRAS):
        raise exceptions.CodigoPrefijoInvalido()
    leido = int(codigo[12])
    esperado = calcular_control(codigo[:12])
    if leido != esperado:
        raise exceptions.CodigoControlInvalido(leido, esperado)
    return codigo

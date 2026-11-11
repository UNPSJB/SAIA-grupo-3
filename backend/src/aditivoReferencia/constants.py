PATRON_INS = r"^\d{3,4}[a-z]?(\([ivx]+\))?$"


class ErrorCode:
    ADITIVO_NO_ENCONTRADO = "El aditivo de referencia no fue encontrado."
    ADITIVO_DUPLICADO = "Ya existe un aditivo de referencia con ese nombre."
    INS_DUPLICADO = "Ya existe un aditivo de referencia con ese número INS."
    INS_OBLIGATORIO = "El número INS es obligatorio para esta clase funcional."
    INS_INVALIDO = "El número INS no es válido. Usá el formato del Codex, por ejemplo 202, 160a o 500(ii)."
    NOMBRE_VACIO = "El nombre completo del aditivo es obligatorio."
    CLASE_INACTIVA = "La clase funcional elegida está dada de baja."

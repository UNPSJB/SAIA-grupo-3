PREFIJO_RUTA = "/uploads/"
TAMANIO_MAXIMO_MB = 10
TAMANIO_MAXIMO_BYTES = TAMANIO_MAXIMO_MB * 1024 * 1024
EXTENSIONES_IMAGEN = {".jpg", ".jpeg", ".png", ".webp"}
EXTENSIONES_IMAGEN_Y_PDF = EXTENSIONES_IMAGEN | {".pdf"}


class ErrorCode:
    FORMATO_NO_PERMITIDO = "Formato de archivo no permitido. Se aceptan:"
    ARCHIVO_DEMASIADO_GRANDE = f"El archivo supera el tamaño máximo de {TAMANIO_MAXIMO_MB} MB."
    ARCHIVO_NO_ENCONTRADO = "El archivo no fue encontrado."

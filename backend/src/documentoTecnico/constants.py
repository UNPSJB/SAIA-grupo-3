class ErrorCode:
    DOCUMENTO_NO_ENCONTRADO = "El documento técnico no fue encontrado."
    VERSION_NO_ENCONTRADA = "La versión del documento no fue encontrada."
    DOCUMENTO_ARCHIVADO = "No se pueden subir versiones a un documento archivado. Reactívelo primero."
    ARCHIVO_REQUERIDO = "Debe adjuntar un archivo."
    ARCHIVO_NO_PERMITIDO = "Formato no permitido. Se aceptan PDF, Word, Excel, JPG y PNG."
    ARCHIVO_DEMASIADO_GRANDE = "El archivo supera el tamaño máximo de 10 MB."
    ARCHIVO_NO_DISPONIBLE = "El archivo de esta versión no se encuentra en el servidor."

EXTENSIONES_PERMITIDAS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"}
TAMANIO_MAXIMO_BYTES = 10 * 1024 * 1024  # 10 MB

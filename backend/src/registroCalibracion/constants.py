EXTENSIONES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
CONTENT_TYPE_PDF = "application/pdf"

class ErrorCode:
    REGISTRO_NO_ENCONTRADO = "El registro de calibración no fue encontrado."
    EQUIPO_NO_ENCONTRADO = "El equipo indicado no existe o no está activo."
    FECHA_CALIBRACION_REQUERIDA = "La fecha en que se realizó la calibración es obligatoria."
    FECHA_CALIBRACION_FUTURA = "La fecha de calibración no puede ser posterior a hoy."
    OTORGADO_POR_REQUERIDO = "Debe indicar quién otorgó el certificado de calibración."
    CERTIFICADO_REQUERIDO = "Debe adjuntar el certificado de calibración (PDF o imagen)."
    FORMATO_ARCHIVO_INVALIDO = "Formato no permitido. El certificado debe ser un archivo PDF o una imagen (JPG, PNG, WEBP)."
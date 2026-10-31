MINIMO_CARACTERES_PASSWORD = 8
MAXIMO_CARACTERES_PASSWORD = 128


class ErrorCode:
    PASSWORD_ACTUAL_INCORRECTA = "La contraseña actual es incorrecta."
    PASSWORD_IGUAL_A_LA_ACTUAL = "La contraseña nueva debe ser distinta de la actual."
    PASSWORDS_NO_COINCIDEN = "La confirmación no coincide con la contraseña nueva."
    PASSWORD_CORTA = f"La contraseña nueva debe tener al menos {MINIMO_CARACTERES_PASSWORD} caracteres."
    EMAIL_DUPLICADO = "Ese email ya está registrado por otra persona."

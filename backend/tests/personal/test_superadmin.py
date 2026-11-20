from sqlalchemy import create_engine, text

from scripts.migrate_superadmin import migrate


def test_migracion_superadmin_es_repetible_y_preserva_datos():
    # Arrange
    # Motor propio: la migración trabaja sobre una tabla legacy creada con SQL crudo,
    # no sobre el modelo actual ni la app de prueba.
    engine = create_engine("sqlite://")
    with engine.begin() as conexion:
        conexion.execute(
            text(
                "CREATE TABLE personal (id INTEGER PRIMARY KEY, username TEXT, nombre TEXT, "
                "operar BOOLEAN, administrar BOOLEAN, activo BOOLEAN)"
            )
        )
        conexion.execute(
            text(
                "INSERT INTO personal VALUES "
                "(1,'admin','Original',0,1,1),(2,'other','Other',0,1,1)"
            )
        )

    # Act
    migrate(engine)
    migrate(engine)

    # Assert
    with engine.connect() as conexion:
        filas = conexion.execute(
            text("SELECT username,nombre,operar,administrar,superadmin FROM personal ORDER BY id")
        ).all()
    assert filas == [("admin", "Original", 1, 1, 1), ("other", "Other", 0, 1, 0)]
    engine.dispose()

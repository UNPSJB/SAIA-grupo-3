from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional, Set

class PersonalBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=50)
    apellido: str = Field(..., min_length=1, max_length=50)
    dni: str = Field(..., min_length=1, max_length=20)
    nroLegajo: str = Field(..., min_length=1, max_length=20)
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    operar: bool = False
    administrar: bool = False

class PersonalCreate(PersonalBase):
    password: str = Field(..., min_length=4)

class PersonalUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=50)
    apellido: Optional[str] = Field(None, min_length=1, max_length=50)
    dni: Optional[str] = Field(None, min_length=1, max_length=20)
    nroLegajo: Optional[str] = Field(None, min_length=1, max_length=20)
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    operar: Optional[bool] = None
    administrar: Optional[bool] = None
    activo: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=4)

class Personal(PersonalBase):
    # Los registros existentes pueden contener dominios de prueba o históricos.
    # EmailStr sigue validando los correos al crear o modificar personal.
    email: str
    id: int
    activo: bool
    role_name: str
    role_id: int
    capacidades: Set[str]
    
    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict


class CatalogoItem(BaseModel):
    """Elemento de catálogo: `id`, `nombre` y solo los campos que aplican al tipo."""

    model_config = ConfigDict(extra="forbid")

    id: int
    nombre: str
    descripcion: str | None = None
    categoria: str | None = None
    categoria_id: int | None = None
    orden: int | None = None
    rango: str | None = None
    aplica_a: str | None = None
    entidad_federativa_id: int | None = None

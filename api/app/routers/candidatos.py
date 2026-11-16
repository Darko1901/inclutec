from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Body, Depends, File, Response, UploadFile, status
from sqlalchemy import delete, select

from app.dependencias import Db, UsuarioActual, exigir_roles
from app.errores import ApiError
from app.esquemas.candidato import (
    CV,
    Consentimiento,
    EliminarCuenta,
    Experiencia,
    ExperienciaEntrada,
    Formacion,
    FormacionEntrada,
    HabilidadCandidato,
    HabilidadesEntrada,
    Necesidades,
    NecesidadesEntrada,
    PerfilCandidato,
    PerfilCandidatoEntrada,
)
from app.esquemas.comunes import Archivo
from app.modelos import (
    CandidatoHabilidad,
    Dispositivo,
    NivelEducativo,
    t_candidato_categoria,
    t_candidato_modalidad,
    t_candidato_necesidad,
)
from app.modelos import Experiencia as ExperienciaTabla
from app.modelos import Formacion as FormacionTabla
from app.seguridad import verificar_contrasena
from app.servicios import archivos
from app.servicios import candidato as servicio
from app.servicios.postulaciones import retirar_activas_de_candidato
from app.validaciones import id_en_rango, lanzar_si_hay_campos
from app.validaciones_candidato import (
    fecha_valida,
    validar_experiencia,
    validar_formacion,
    validar_habilidades,
    validar_necesidades,
    validar_perfil,
)

router = APIRouter(
    prefix="/candidatos/me",
    tags=["Perfil y CV del candidato"],
    dependencies=[Depends(exigir_roles("candidato"))],
)

Actual = Annotated[UsuarioActual, Depends(exigir_roles("candidato"))]


def _texto_o_nulo(valor: str | None) -> str | None:
    texto = valor.strip() if valor else None
    return texto or None


def _no_encontrado() -> ApiError:
    return ApiError(404, "no_encontrado", "No encontramos ese registro.")


def _sin_repetidos(ids: list[int]) -> list[int]:
    return list(dict.fromkeys(ids))


# --- Perfil -------------------------------------------------------------------------------------


@router.get(
    "", response_model=PerfilCandidato, summary="Mi perfil", operation_id="get_candidatos_me"
)
def mi_perfil(actual: Actual, db: Db) -> PerfilCandidato:
    return servicio.perfil_de(db, actual.id)


@router.put(
    "",
    response_model=PerfilCandidato,
    summary="Actualizar mi perfil",
    operation_id="put_candidatos_me",
)
def actualizar_perfil(datos: PerfilCandidatoEntrada, actual: Actual, db: Db) -> PerfilCandidato:
    candidato = servicio.candidato_de(db, actual.id)
    lanzar_si_hay_campos(validar_perfil(db, datos))

    actual.usuario.nombre = datos.nombre.strip()
    actual.usuario.apellidos = datos.apellidos.strip()
    actual.usuario.telefono = datos.telefono
    actual.usuario.actualizado_en = datetime.now(UTC)
    candidato.municipio_id = datos.municipio_id
    candidato.jornada_id = datos.jornada_id
    candidato.resumen = _texto_o_nulo(datos.resumen)
    candidato.disponible_reubicacion = datos.disponible_reubicacion
    candidato.compartir_ajustes = datos.compartir_ajustes

    for tabla, columna, ids in (
        (t_candidato_modalidad, "modalidad_id", datos.modalidad_ids),
        (t_candidato_categoria, "categoria_id", datos.categoria_ids),
    ):
        db.execute(delete(tabla).where(tabla.c.candidato_id == actual.id))
        if ids:
            db.execute(
                tabla.insert(),
                [{"candidato_id": actual.id, columna: i} for i in _sin_repetidos(ids)],
            )
    servicio.tocar(db, candidato)
    return servicio.perfil_de(db, actual.id)


@router.post(
    "/foto", response_model=Archivo, summary="Subir foto", operation_id="post_candidatos_me_foto"
)
def subir_foto(
    actual: Actual, db: Db, archivo: Annotated[UploadFile | None, File()] = None
) -> Archivo:
    candidato = servicio.candidato_de(db, actual.id)
    contenido, extension = archivos.leer_imagen(archivo, "La foto", "una más ligera")
    candidato.foto_url = archivos.guardar("fotos", f"candidato-{actual.id}", extension, contenido)
    servicio.tocar(db, candidato)
    return Archivo(url=candidato.foto_url)


@router.delete(
    "/foto",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Quitar foto",
    operation_id="delete_candidatos_me_foto",
)
def quitar_foto(actual: Actual, db: Db) -> Response:
    candidato = servicio.candidato_de(db, actual.id)
    archivos.borrar_por_url(candidato.foto_url)
    candidato.foto_url = None
    servicio.tocar(db, candidato)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put(
    "/consentimiento",
    response_model=PerfilCandidato,
    summary="Otorgar o revocar consentimiento",
    operation_id="put_candidatos_me_consentimiento",
)
def cambiar_consentimiento(datos: Consentimiento, actual: Actual, db: Db) -> PerfilCandidato:
    candidato = servicio.candidato_de(db, actual.id)
    if datos.otorgado is None:
        lanzar_si_hay_campos({"otorgado": "Indica si otorgas o retiras tu consentimiento."})
    if datos.otorgado:
        if candidato.consentimiento_sensibles_en is None:
            candidato.consentimiento_sensibles_en = datetime.now(UTC)
    else:
        # Revocar el consentimiento borra las necesidades de ajuste y la nota.
        candidato.consentimiento_sensibles_en = None
        candidato.nota_ajustes = None
        db.execute(
            delete(t_candidato_necesidad).where(t_candidato_necesidad.c.candidato_id == actual.id)
        )
    servicio.tocar(db, candidato)
    return servicio.perfil_de(db, actual.id)


@router.put(
    "/necesidades",
    response_model=Necesidades,
    summary="Guardar necesidades de ajuste",
    operation_id="put_candidatos_me_necesidades",
)
def guardar_necesidades(datos: NecesidadesEntrada, actual: Actual, db: Db) -> Necesidades:
    candidato = servicio.candidato_de(db, actual.id)
    # Sin consentimiento vigente no se guarda nada: dato personal sensible (LFPDPPP).
    if candidato.consentimiento_sensibles_en is None:
        raise ApiError(
            403,
            "sin_consentimiento",
            "Para registrar tus necesidades de ajuste, primero da tu consentimiento.",
        )
    lanzar_si_hay_campos(validar_necesidades(db, datos))

    db.execute(
        delete(t_candidato_necesidad).where(t_candidato_necesidad.c.candidato_id == actual.id)
    )
    ids = _sin_repetidos(datos.ajuste_ids)
    if ids:
        db.execute(
            t_candidato_necesidad.insert(),
            [{"candidato_id": actual.id, "ajuste_id": i} for i in ids],
        )
    candidato.nota_ajustes = _texto_o_nulo(datos.nota_ajustes)
    servicio.tocar(db, candidato)
    return Necesidades(
        necesidades=servicio.necesidades_de(db, actual.id), nota_ajustes=candidato.nota_ajustes
    )


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar mi cuenta",
    operation_id="delete_candidatos_me",
)
def eliminar_cuenta(
    actual: Actual, db: Db, datos: Annotated[EliminarCuenta | None, Body()] = None
) -> Response:
    """Derecho ARCO de cancelación: baja lógica y borrado de necesidades, foto, CV y equipos."""
    contrasena = datos.contrasena if datos else None
    if not isinstance(contrasena, str) or not verificar_contrasena(
        contrasena, actual.usuario.contrasena_hash
    ):
        raise ApiError(400, "contrasena_incorrecta", "La contraseña no coincide.")

    candidato = servicio.candidato_de(db, actual.id)
    retirar_activas_de_candidato(db, actual.id, actual.id)
    archivos.borrar_por_url(candidato.foto_url)
    candidato.foto_url = None
    servicio.borrar_cv_y_necesidades(db, candidato)
    db.execute(delete(Dispositivo).where(Dispositivo.usuario_id == actual.id))
    actual.usuario.estado = "eliminado"
    actual.usuario.actualizado_en = datetime.now(UTC)
    servicio.tocar(db, candidato)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Experiencias -------------------------------------------------------------------------------


def _datos_experiencia(datos: ExperienciaEntrada) -> dict:
    return {
        "puesto": datos.puesto.strip(),
        "empresa": datos.empresa.strip(),
        "fecha_inicio": fecha_valida(datos.fecha_inicio),
        "fecha_fin": None if datos.actual else fecha_valida(datos.fecha_fin),
        "actual": datos.actual,
        "descripcion": _texto_o_nulo(datos.descripcion),
    }


def _experiencia_propia(db: Db, actual: UsuarioActual, id_: int) -> ExperienciaTabla:
    if not id_en_rango(ExperienciaTabla, id_):
        raise _no_encontrado()
    fila = db.scalar(
        select(ExperienciaTabla).where(
            ExperienciaTabla.id == id_, ExperienciaTabla.candidato_id == actual.id
        )
    )
    if fila is None:
        raise _no_encontrado()
    return fila


@router.get(
    "/experiencias",
    response_model=list[Experiencia],
    summary="Mis experiencias",
    operation_id="get_candidatos_me_experiencias",
)
def listar_experiencias(actual: Actual, db: Db) -> list[Experiencia]:
    return servicio.experiencias_de(db, actual.id)


@router.post(
    "/experiencias",
    response_model=Experiencia,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar experiencia",
    operation_id="post_candidatos_me_experiencias",
)
def agregar_experiencia(datos: ExperienciaEntrada, actual: Actual, db: Db) -> Experiencia:
    candidato = servicio.candidato_de(db, actual.id)
    lanzar_si_hay_campos(validar_experiencia(datos))
    fila = ExperienciaTabla(candidato_id=actual.id, **_datos_experiencia(datos))
    db.add(fila)
    db.flush()
    servicio.tocar(db, candidato)
    return Experiencia.model_validate(fila)


@router.put(
    "/experiencias/{id}",
    response_model=Experiencia,
    summary="Editar experiencia",
    operation_id="put_candidatos_me_experiencias_id",
)
def editar_experiencia(id: int, datos: ExperienciaEntrada, actual: Actual, db: Db) -> Experiencia:
    fila = _experiencia_propia(db, actual, id)
    lanzar_si_hay_campos(validar_experiencia(datos))
    for campo, valor in _datos_experiencia(datos).items():
        setattr(fila, campo, valor)
    servicio.tocar(db, servicio.candidato_de(db, actual.id))
    return Experiencia.model_validate(fila)


@router.delete(
    "/experiencias/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar experiencia",
    operation_id="delete_candidatos_me_experiencias_id",
)
def eliminar_experiencia(id: int, actual: Actual, db: Db) -> Response:
    fila = _experiencia_propia(db, actual, id)
    db.delete(fila)
    db.flush()
    servicio.tocar(db, servicio.candidato_de(db, actual.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Formaciones --------------------------------------------------------------------------------


def _datos_formacion(datos: FormacionEntrada) -> dict:
    return {
        "nivel_educativo_id": datos.nivel_educativo_id,
        "institucion": datos.institucion.strip(),
        "carrera": _texto_o_nulo(datos.carrera),
        "estado": datos.estado,
        "fecha_inicio": fecha_valida(datos.fecha_inicio),
        "fecha_fin": fecha_valida(datos.fecha_fin),
    }


def _formacion_propia(db: Db, actual: UsuarioActual, id_: int) -> FormacionTabla:
    if not id_en_rango(FormacionTabla, id_):
        raise _no_encontrado()
    fila = db.scalar(
        select(FormacionTabla).where(
            FormacionTabla.id == id_, FormacionTabla.candidato_id == actual.id
        )
    )
    if fila is None:
        raise _no_encontrado()
    return fila


def _vista_formacion(db: Db, fila: FormacionTabla) -> Formacion:
    nivel = db.get(NivelEducativo, fila.nivel_educativo_id)
    return servicio.formacion_de_fila(fila, nivel)


@router.get(
    "/formaciones",
    response_model=list[Formacion],
    summary="Mis formaciones",
    operation_id="get_candidatos_me_formaciones",
)
def listar_formaciones(actual: Actual, db: Db) -> list[Formacion]:
    return servicio.formaciones_de(db, actual.id)


@router.post(
    "/formaciones",
    response_model=Formacion,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar formación",
    operation_id="post_candidatos_me_formaciones",
)
def agregar_formacion(datos: FormacionEntrada, actual: Actual, db: Db) -> Formacion:
    candidato = servicio.candidato_de(db, actual.id)
    lanzar_si_hay_campos(validar_formacion(db, datos))
    fila = FormacionTabla(candidato_id=actual.id, **_datos_formacion(datos))
    db.add(fila)
    db.flush()
    servicio.tocar(db, candidato)
    return _vista_formacion(db, fila)


@router.put(
    "/formaciones/{id}",
    response_model=Formacion,
    summary="Editar formación",
    operation_id="put_candidatos_me_formaciones_id",
)
def editar_formacion(id: int, datos: FormacionEntrada, actual: Actual, db: Db) -> Formacion:
    fila = _formacion_propia(db, actual, id)
    lanzar_si_hay_campos(validar_formacion(db, datos))
    for campo, valor in _datos_formacion(datos).items():
        setattr(fila, campo, valor)
    servicio.tocar(db, servicio.candidato_de(db, actual.id))
    return _vista_formacion(db, fila)


@router.delete(
    "/formaciones/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar formación",
    operation_id="delete_candidatos_me_formaciones_id",
)
def eliminar_formacion(id: int, actual: Actual, db: Db) -> Response:
    fila = _formacion_propia(db, actual, id)
    db.delete(fila)
    db.flush()
    servicio.tocar(db, servicio.candidato_de(db, actual.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Habilidades y vista previa -----------------------------------------------------------------


@router.get(
    "/habilidades",
    response_model=list[HabilidadCandidato],
    summary="Mis habilidades",
    operation_id="get_candidatos_me_habilidades",
)
def listar_habilidades(actual: Actual, db: Db) -> list[HabilidadCandidato]:
    return servicio.habilidades_de(db, actual.id)


@router.put(
    "/habilidades",
    response_model=list[HabilidadCandidato],
    summary="Guardar mis habilidades",
    operation_id="put_candidatos_me_habilidades",
)
def guardar_habilidades(
    datos: HabilidadesEntrada, actual: Actual, db: Db
) -> list[HabilidadCandidato]:
    candidato = servicio.candidato_de(db, actual.id)
    validar_habilidades(db, datos)
    db.execute(delete(CandidatoHabilidad).where(CandidatoHabilidad.candidato_id == actual.id))
    db.add_all(
        CandidatoHabilidad(candidato_id=actual.id, habilidad_id=h.habilidad_id, nivel=h.nivel)
        for h in datos.habilidades
    )
    db.flush()
    servicio.tocar(db, candidato)
    return servicio.habilidades_de(db, actual.id)


@router.get(
    "/vista-previa",
    response_model=CV,
    summary="Vista previa de mi CV",
    operation_id="get_candidatos_me_vista_previa",
)
def vista_previa(actual: Actual, db: Db) -> CV:
    """El CV como lo ve una empresa: sin correo ni teléfono (solo desde el estado «entrevista»)."""
    return servicio.cv_de(db, actual.id, con_contacto=False)

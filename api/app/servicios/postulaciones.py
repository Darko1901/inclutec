"""Reglas de postulaciones: candidato (CU-07, CU-10, CU-11) y reclutador (CU-16, CU-17)."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errores import ApiError
from app.esquemas.postulacion import (
    AutorObservacion,
    CandidatoDePostulado,
    CompatibilidadReclutador,
    ComponentesReclutador,
    EmpresaDePostulacion,
    EventoHistorial,
    NecesidadDePostulado,
    Observacion,
    PostulacionDePostulado,
    PostulacionDetalle,
    PostulacionResumen,
    Postulado,
    PostuladoDetalle,
    ResultadoCambioEstado,
    VacanteDePostulacion,
    VacanteMini,
)
from app.esquemas.vacante import DesgloseFormacion, DesgloseHabilidades, DesgloseModalidad
from app.modelos import (
    Ajuste,
    Candidato,
    Compatibilidad,
    Empresa,
    HistorialPostulacion,
    HorarioEntrevista,
    Postulacion,
    Reclutador,
    Usuario,
    Vacante,
    VacanteAjuste,
    t_candidato_necesidad,
)
from app.modelos import (
    Observacion as ObservacionTabla,
)
from app.servicios import compatibilidad as motor
from app.servicios import entrevistas as servicio_entrevistas
from app.servicios import notificaciones
from app.servicios import vacantes as servicio_vacantes
from app.servicios.candidato import cv_de, perfil_de

ESTADOS_ACTIVOS = ("postulada", "en_revision", "entrevista")
ESTADOS = (*ESTADOS_ACTIVOS, "aceptada", "no_seleccionada", "retirada")

# Transiciones que puede pedir el reclutador (sección 2 del contrato).
TRANSICIONES: dict[str, tuple[str, ...]] = {
    "postulada": ("en_revision", "no_seleccionada"),
    "en_revision": ("entrevista", "no_seleccionada"),
    "entrevista": ("aceptada", "no_seleccionada"),
    "aceptada": (),
    "no_seleccionada": (),
    "retirada": (),
}
# El contacto del candidato se ve solo a partir de «entrevista».
ESTADOS_CON_CONTACTO = ("entrevista", "aceptada")
TEXTO_ESTADO = {
    "postulada": "Postulada",
    "en_revision": "En revisión",
    "entrevista": "Entrevista",
    "aceptada": "Aceptada",
    "no_seleccionada": "No seleccionada",
    "retirada": "Retirada",
}

MAX_MENSAJE = 500
MAX_OBSERVACION = 1000


def retirar_activas_de_candidato(db: Session, candidato_id: int, usuario_id: int) -> int:
    """Pasa a `retirada` las postulaciones en curso del candidato (baja de cuenta)."""
    activas = db.scalars(
        select(Postulacion)
        .where(Postulacion.candidato_id == candidato_id, Postulacion.estado.in_(ESTADOS_ACTIVOS))
        .order_by(Postulacion.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).all()
    for postulacion in activas:
        servicio_entrevistas.retirar_postulacion(db, postulacion, usuario_id)
    db.flush()
    return len(activas)


# --- Lectura ------------------------------------------------------------------------------------


def no_encontrada() -> ApiError:
    return ApiError(404, "no_encontrado", "No encontramos esa postulación.")


def postulacion_duplicada() -> ApiError:
    return ApiError(409, "postulacion_duplicada", "Ya te postulaste a esta vacante.")


def _id_valido(id_: int) -> bool:
    return 1 <= id_ <= 2**63 - 1


def _obtener(db: Session, id_: int, bloquear: bool) -> Postulacion | None:
    """`bloquear` toma la fila con SELECT … FOR UPDATE y la relee: quien cambia el estado de una
    postulación (o de su entrevista) espera a que termine el otro y decide con el estado ya
    actualizado. Así un doble toque no duplica el historial ni las notificaciones."""
    if not _id_valido(id_):
        return None
    if bloquear:
        return db.get(Postulacion, id_, with_for_update=True, populate_existing=True)
    return db.get(Postulacion, id_)


def bloquear(db: Session, postulacion_id: int) -> Postulacion:
    """Bloquea la postulación (ver `_obtener`); para operaciones que llegan por su entrevista."""
    return db.get(Postulacion, postulacion_id, with_for_update=True, populate_existing=True)


def historial_de(db: Session, postulacion_id: int) -> list[EventoHistorial]:
    """Del más antiguo al más reciente."""
    filas = db.scalars(
        select(HistorialPostulacion)
        .where(HistorialPostulacion.postulacion_id == postulacion_id)
        .order_by(HistorialPostulacion.creado_en, HistorialPostulacion.id)
    )
    return [EventoHistorial.model_validate(f) for f in filas]


def _vacante_mini(db: Session, vacante: Vacante) -> VacanteDePostulacion:
    empresa = db.get(Empresa, vacante.empresa_id)
    return VacanteDePostulacion(
        id=vacante.id,
        titulo=vacante.titulo,
        empresa=EmpresaDePostulacion(
            id=empresa.id, nombre_comercial=empresa.nombre_comercial, logo_url=empresa.logo_url
        ),
    )


def postulacion_propia(
    db: Session, candidato_id: int, id_: int, *, bloquear: bool = False
) -> Postulacion:
    """Una postulación ajena responde como si no existiera."""
    postulacion = _obtener(db, id_, bloquear)
    if postulacion is None or postulacion.candidato_id != candidato_id:
        raise no_encontrada()
    return postulacion


def detalle_para_candidato(db: Session, postulacion: Postulacion) -> PostulacionDetalle:
    vacante = db.get(Vacante, postulacion.vacante_id)
    entrevista = servicio_entrevistas.entrevista_vigente_de(db, postulacion.id)
    return PostulacionDetalle(
        id=postulacion.id,
        vacante=_vacante_mini(db, vacante),
        estado=postulacion.estado,
        mensaje=postulacion.mensaje,
        comparte_ajustes=postulacion.comparte_ajustes,
        creado_en=postulacion.creado_en,
        actualizado_en=postulacion.actualizado_en,
        historial=historial_de(db, postulacion.id),
        entrevista=(
            servicio_entrevistas.vista_de(db, entrevista, para_candidato=True)
            if entrevista
            else None
        ),
        puede_retirar=postulacion.estado in ESTADOS_ACTIVOS,
    )


def resumen_de(db: Session, postulacion: Postulacion) -> PostulacionResumen:
    vacante = db.get(Vacante, postulacion.vacante_id)
    entrevista = servicio_entrevistas.entrevista_vigente_de(db, postulacion.id)
    inicio = None
    if entrevista is not None and entrevista.estado == "agendada":
        inicio = db.get(HorarioEntrevista, entrevista.horario_id).inicio
    return PostulacionResumen(
        id=postulacion.id,
        vacante=_vacante_mini(db, vacante),
        estado=postulacion.estado,
        creado_en=postulacion.creado_en,
        actualizado_en=postulacion.actualizado_en,
        entrevista_inicio=inicio,
    )


# --- Postularse ---------------------------------------------------------------------------------


def faltantes_para_postularse(db: Session, candidato_id: int) -> dict[str, str]:
    """Perfil mínimo: nombre, municipio, al menos una habilidad y al menos una formación."""
    perfil = perfil_de(db, candidato_id)
    faltantes: dict[str, str] = {}
    if not perfil.usuario.nombre:
        faltantes["nombre"] = "Escribe tu nombre."
    if perfil.municipio is None:
        faltantes["municipio_id"] = "Elige tu municipio."
    if "habilidades" in perfil.secciones_pendientes:
        faltantes["habilidades"] = "Agrega al menos una habilidad."
    if "formacion" in perfil.secciones_pendientes:
        faltantes["formacion"] = "Agrega al menos una formación."
    return faltantes


def crear(
    db: Session,
    candidato_id: int,
    vacante: Vacante,
    mensaje: str | None,
    compartir_ajustes: bool,
) -> Postulacion:
    candidato = db.get(Candidato, candidato_id)
    texto = mensaje.strip() if mensaje and mensaje.strip() else None
    postulacion = Postulacion(
        candidato_id=candidato_id,
        vacante_id=vacante.id,
        estado="postulada",
        mensaje=texto,
        # Sin consentimiento vigente no hay necesidades que compartir.
        comparte_ajustes=compartir_ajustes and candidato.consentimiento_sensibles_en is not None,
    )
    try:
        # Dos «Postularme» casi simultáneos pasan los dos la revisión previa: el segundo choca
        # con uq_postulacion y responde lo mismo que si ya existiera, no un 500.
        with db.begin_nested():
            db.add(postulacion)
            db.flush()
    except IntegrityError as error:
        raise postulacion_duplicada() from error
    db.add(
        HistorialPostulacion(
            postulacion_id=postulacion.id,
            usuario_id=candidato_id,
            estado_anterior=None,
            estado_nuevo="postulada",
        )
    )

    # Avisa a los reclutadores de la empresa (nueva_postulacion → REC-05).
    usuario = db.get(Usuario, candidato_id)
    reclutadores = db.scalars(
        select(Reclutador.usuario_id)
        .join(Usuario, Usuario.id == Reclutador.usuario_id)
        .where(Reclutador.empresa_id == vacante.empresa_id, Usuario.estado == "activo")
    ).all()
    for reclutador_id in reclutadores:
        notificaciones.crear(
            db,
            reclutador_id,
            "nueva_postulacion",
            "Nueva postulación",
            f"{usuario.nombre} {usuario.apellidos} se postuló a {vacante.titulo}.",
            "postulacion",
            postulacion.id,
        )
    db.flush()
    return postulacion


# --- Lado del reclutador ------------------------------------------------------------------------


def sin_permiso() -> ApiError:
    return ApiError(403, "sin_permiso", "Esta vacante o postulación no es de tu empresa.")


def postulacion_de_mi_empresa(
    db: Session, empresa_id: int, id_: int, *, bloquear: bool = False
) -> Postulacion:
    """Inexistente → 404; de una vacante de otra empresa → 403 (como dice el contrato)."""
    postulacion = _obtener(db, id_, bloquear)
    if postulacion is None:
        raise ApiError(404, "no_encontrado", "La postulación no existe.")
    vacante = db.get(Vacante, postulacion.vacante_id)
    if vacante.empresa_id != empresa_id:
        raise sin_permiso()
    return postulacion


def _comparte_necesidades(postulacion: Postulacion, candidato: Candidato) -> bool:
    """El candidato las compartió en esta postulación y sigue dando su consentimiento."""
    return postulacion.comparte_ajustes and candidato.consentimiento_sensibles_en is not None


def _necesidades(db: Session, candidato_id: int) -> list[int]:
    return list(
        db.scalars(
            select(t_candidato_necesidad.c.ajuste_id)
            .where(t_candidato_necesidad.c.candidato_id == candidato_id)
            .order_by(t_candidato_necesidad.c.ajuste_id)
        )
    )


def _tipos_de_ajuste(db: Session, vacante_id: int) -> dict[int, str]:
    return dict(
        db.execute(
            select(VacanteAjuste.ajuste_id, VacanteAjuste.tipo).where(
                VacanteAjuste.vacante_id == vacante_id
            )
        ).all()
    )


def _ajustes_por_confirmar(
    db: Session, postulacion: Postulacion, candidato: Candidato, vacante: Vacante
) -> bool:
    """true si compartió necesidades que la vacante no tiene como «existente»."""
    if not _comparte_necesidades(postulacion, candidato):
        return False
    tipos = _tipos_de_ajuste(db, vacante.id)
    return any(tipos.get(i) != "existente" for i in _necesidades(db, candidato.usuario_id))


def listar_postulados(
    db: Session,
    vacante: Vacante,
    *,
    estado: str | None,
    compatibilidad_min: int | None,
    desplazamiento: int,
    limite: int,
) -> tuple[list[Postulado], int]:
    """Ordenados por compatibilidad del reclutador (sin A); sin filtro no salen las retiradas."""
    filtros = [Postulacion.vacante_id == vacante.id]
    filtros.append(Postulacion.estado == estado if estado else Postulacion.estado != "retirada")

    postulaciones = db.scalars(select(Postulacion).where(*filtros)).all()
    for p in postulaciones:
        motor.asegurar_candidato(db, p.candidato_id, [vacante])
    puntajes = dict(
        db.execute(
            select(Compatibilidad.candidato_id, Compatibilidad.puntaje_reclutador).where(
                Compatibilidad.vacante_id == vacante.id,
                Compatibilidad.candidato_id.in_([p.candidato_id for p in postulaciones] or [0]),
            )
        ).all()
    )

    filas = []
    for p in postulaciones:
        puntaje = puntajes.get(p.candidato_id, 0)
        if puntaje < (compatibilidad_min or 0):
            continue
        filas.append((puntaje, p))
    # Mayor compatibilidad primero; en empate, quien se postuló antes.
    filas.sort(key=lambda f: (-f[0], f[1].creado_en, f[1].id))

    items = []
    for puntaje, p in filas[desplazamiento : desplazamiento + limite]:
        usuario = db.get(Usuario, p.candidato_id)
        candidato = db.get(Candidato, p.candidato_id)
        items.append(
            Postulado(
                postulacion_id=p.id,
                candidato=CandidatoDePostulado(
                    id=usuario.id,
                    nombre=usuario.nombre,
                    apellidos=usuario.apellidos,
                    foto_url=candidato.foto_url,
                ),
                compatibilidad=puntaje,
                estado=p.estado,
                creado_en=p.creado_en,
                ajustes_por_confirmar=_ajustes_por_confirmar(db, p, candidato, vacante),
            )
        )
    return items, len(filas)


def detalle_de_postulado(db: Session, postulacion: Postulacion) -> PostuladoDetalle:
    vacante = db.get(Vacante, postulacion.vacante_id)
    candidato = db.get(Candidato, postulacion.candidato_id)
    resultado = motor.recalcular_par(db, postulacion.candidato_id, vacante)
    desglose = servicio_vacantes.desglose_de(db, vacante, postulacion.candidato_id)
    entrevista = servicio_entrevistas.entrevista_vigente_de(db, postulacion.id)
    comparte = _comparte_necesidades(postulacion, candidato)

    necesidades = None
    if comparte:
        tipos = _tipos_de_ajuste(db, vacante.id)
        necesidades = []
        for ajuste_id in _necesidades(db, candidato.usuario_id):
            ajuste = db.get(Ajuste, ajuste_id)
            necesidades.append(
                NecesidadDePostulado(
                    id=ajuste.id,
                    nombre=ajuste.nombre,
                    categoria=ajuste.categoria,
                    estado=tipos.get(ajuste_id, "no_declarada"),
                )
            )
    return PostuladoDetalle(
        postulacion=PostulacionDePostulado(
            id=postulacion.id,
            estado=postulacion.estado,
            mensaje=postulacion.mensaje,
            creado_en=postulacion.creado_en,
            historial=historial_de(db, postulacion.id),
        ),
        vacante=VacanteMini(id=vacante.id, titulo=vacante.titulo),
        candidato=cv_de(
            db, postulacion.candidato_id, con_contacto=postulacion.estado in ESTADOS_CON_CONTACTO
        ),
        # Sin el componente A: las necesidades nunca cuentan para el reclutador.
        compatibilidad=CompatibilidadReclutador(
            puntaje=resultado.puntaje_reclutador,
            componentes=ComponentesReclutador(
                h=desglose.componentes.h, m=desglose.componentes.m, f=desglose.componentes.f
            ),
            habilidades=DesgloseHabilidades(**desglose.habilidades.model_dump()),
            modalidad=DesgloseModalidad(**desglose.modalidad.model_dump()),
            formacion=DesgloseFormacion(**desglose.formacion.model_dump()),
        ),
        necesidades=necesidades,
        nota_ajustes=candidato.nota_ajustes if comparte else None,
        transiciones_permitidas=list(TRANSICIONES[postulacion.estado]),
        entrevista=(
            servicio_entrevistas.vista_de(db, entrevista, para_candidato=False)
            if entrevista
            else None
        ),
    )


def cambiar_estado(
    db: Session, postulacion: Postulacion, nuevo: str, mensaje: str | None, usuario_id: int
) -> ResultadoCambioEstado:
    vacante = db.get(Vacante, postulacion.vacante_id)
    anterior = postulacion.estado
    texto = mensaje.strip() if mensaje and mensaje.strip() else None
    db.add(
        HistorialPostulacion(
            postulacion_id=postulacion.id,
            usuario_id=usuario_id,
            estado_anterior=anterior,
            estado_nuevo=nuevo,
            mensaje=texto,
        )
    )
    postulacion.estado = nuevo
    postulacion.actualizado_en = servicio_entrevistas.ahora()

    # Una persona no seleccionada ya no entrevista: su entrevista agendada se cancela y el horario
    # queda cancelado (el aviso al candidato es el del cambio de estado).
    if nuevo == "no_seleccionada":
        entrevista = servicio_entrevistas.entrevista_vigente_de(db, postulacion.id)
        if entrevista is not None and entrevista.estado == "agendada":
            horario = db.get(HorarioEntrevista, entrevista.horario_id)
            entrevista.estado = "cancelada"
            entrevista.motivo_cancelacion = "La postulación cambió de estado."
            entrevista.cancelada_por = usuario_id
            horario.estado = "cancelado"

    # Avisa al candidato (cambio_estado → CAN-06) por app, push y correo.
    notificaciones.crear(
        db,
        postulacion.candidato_id,
        "cambio_estado",
        "Tu postulación avanzó",
        f"Tu postulación a {vacante.titulo} pasó a {TEXTO_ESTADO[nuevo]}.",
        "postulacion",
        postulacion.id,
    )
    db.flush()
    return ResultadoCambioEstado(
        id=postulacion.id,
        estado=postulacion.estado,
        historial=historial_de(db, postulacion.id),
        transiciones_permitidas=list(TRANSICIONES[postulacion.estado]),
    )


def _observacion_vista(db: Session, fila: ObservacionTabla) -> Observacion:
    autor = db.get(Usuario, fila.autor_id)
    return Observacion(
        id=fila.id,
        texto=fila.texto,
        autor=AutorObservacion(id=autor.id, nombre=autor.nombre, apellidos=autor.apellidos),
        creado_en=fila.creado_en,
    )


def listar_observaciones(db: Session, postulacion_id: int) -> list[Observacion]:
    """Las más recientes primero. El candidato nunca las ve."""
    filas = db.scalars(
        select(ObservacionTabla)
        .where(ObservacionTabla.postulacion_id == postulacion_id)
        .order_by(ObservacionTabla.creado_en.desc(), ObservacionTabla.id.desc())
    )
    return [_observacion_vista(db, f) for f in filas]


def agregar_observacion(db: Session, postulacion_id: int, autor_id: int, texto: str) -> Observacion:
    fila = ObservacionTabla(postulacion_id=postulacion_id, autor_id=autor_id, texto=texto.strip())
    db.add(fila)
    db.flush()
    return _observacion_vista(db, fila)

"""Modelos SQLAlchemy de las 39 tablas de db/migraciones (V001 y V002).

Generado con sqlacodegen sobre la base ya creada (sin relaciones; las consultas hacen los JOIN
explícitos). No se edita a mano: el esquema vive solo en db/ y estos modelos lo mapean, nunca lo
crean (no hay create_all ni Alembic). Para regenerarlo, ver api/README.md.
"""
from typing import Optional
import datetime
import decimal

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, Date, DateTime, ForeignKeyConstraint, Identity, Index, Integer, Numeric, PrimaryKeyConstraint, SmallInteger, String, Table, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass


class Ajuste(Base):
    __tablename__ = 'ajuste'
    __table_args__ = (
        CheckConstraint("categoria::text = ANY (ARRAY['movilidad'::character varying, 'visual'::character varying, 'auditiva'::character varying, 'comunicacion'::character varying, 'cognitiva_psicosocial'::character varying, 'general'::character varying]::text[])", name='ck_ajuste_categoria'),
        PrimaryKeyConstraint('id', name='ajuste_pkey'),
        UniqueConstraint('nombre', name='ajuste_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    categoria: Mapped[str] = mapped_column(String(25), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class Categoria(Base):
    __tablename__ = 'categoria'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='categoria_pkey'),
        UniqueConstraint('nombre', name='categoria_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))


class EntidadFederativa(Base):
    __tablename__ = 'entidad_federativa'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='entidad_federativa_pkey'),
        UniqueConstraint('nombre', name='entidad_federativa_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40), nullable=False)


class Jornada(Base):
    __tablename__ = 'jornada'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='jornada_pkey'),
        UniqueConstraint('nombre', name='jornada_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(40), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class Modalidad(Base):
    __tablename__ = 'modalidad'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='modalidad_pkey'),
        UniqueConstraint('nombre', name='modalidad_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(20), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class MotivoReporte(Base):
    __tablename__ = 'motivo_reporte'
    __table_args__ = (
        CheckConstraint("aplica_a::text = ANY (ARRAY['vacante'::character varying, 'empresa'::character varying, 'candidato'::character varying, 'todos'::character varying]::text[])", name='ck_motivo_aplica'),
        PrimaryKeyConstraint('id', name='motivo_reporte_pkey'),
        UniqueConstraint('nombre', name='motivo_reporte_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    aplica_a: Mapped[str] = mapped_column(String(10), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class NivelEducativo(Base):
    __tablename__ = 'nivel_educativo'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='nivel_educativo_pkey'),
        UniqueConstraint('nombre', name='nivel_educativo_nombre_key'),
        UniqueConstraint('orden', name='nivel_educativo_orden_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(40), nullable=False)
    orden: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class Rol(Base):
    __tablename__ = 'rol'
    __table_args__ = (
        CheckConstraint("nombre::text = ANY (ARRAY['candidato'::character varying, 'reclutador'::character varying, 'administrador'::character varying]::text[])", name='ck_rol_nombre'),
        PrimaryKeyConstraint('id', name='rol_pkey'),
        UniqueConstraint('nombre', name='rol_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(20), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(150))


class Sector(Base):
    __tablename__ = 'sector'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='sector_pkey'),
        UniqueConstraint('nombre', name='sector_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class TamanoEmpresa(Base):
    __tablename__ = 'tamano_empresa'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tamano_empresa_pkey'),
        UniqueConstraint('nombre', name='tamano_empresa_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(30), nullable=False)
    rango: Mapped[str] = mapped_column(String(40), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class TipoContrato(Base):
    __tablename__ = 'tipo_contrato'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tipo_contrato_pkey'),
        UniqueConstraint('nombre', name='tipo_contrato_nombre_key')
    )

    id: Mapped[int] = mapped_column(SmallInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(40), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class Habilidad(Base):
    __tablename__ = 'habilidad'
    __table_args__ = (
        ForeignKeyConstraint(['categoria_id'], ['categoria.id'], name='habilidad_categoria_id_fkey'),
        PrimaryKeyConstraint('id', name='habilidad_pkey'),
        UniqueConstraint('nombre', name='habilidad_nombre_key'),
        Index('ix_habilidad_categoria', 'categoria_id')
    )

    id: Mapped[int] = mapped_column(Integer, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=2147483647, cycle=False, cache=1), primary_key=True, autoincrement=True)
    categoria_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class Municipio(Base):
    __tablename__ = 'municipio'
    __table_args__ = (
        ForeignKeyConstraint(['entidad_federativa_id'], ['entidad_federativa.id'], name='municipio_entidad_federativa_id_fkey'),
        PrimaryKeyConstraint('id', name='municipio_pkey'),
        UniqueConstraint('entidad_federativa_id', 'clave', name='uq_municipio'),
        Index('ix_municipio_entidad', 'entidad_federativa_id')
    )

    id: Mapped[int] = mapped_column(Integer, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=2147483647, cycle=False, cache=1), primary_key=True, autoincrement=True)
    entidad_federativa_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    clave: Mapped[str] = mapped_column(String(3), nullable=False)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)


class Usuario(Base):
    __tablename__ = 'usuario'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['activo'::character varying, 'suspendido'::character varying, 'eliminado'::character varying]::text[])", name='ck_usuario_estado'),
        CheckConstraint("telefono IS NULL OR telefono::text ~ '^[0-9]{10}$'::text", name='ck_usuario_telefono'),
        ForeignKeyConstraint(['rol_id'], ['rol.id'], name='usuario_rol_id_fkey'),
        PrimaryKeyConstraint('id', name='usuario_pkey'),
        UniqueConstraint('correo', name='usuario_correo_key'),
        Index('ix_usuario_rol', 'rol_id')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    rol_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    correo: Mapped[str] = mapped_column(String(254), nullable=False)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(120), nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False, server_default=text("'activo'::character varying"))
    acepto_aviso_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    actualizado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    telefono: Mapped[Optional[str]] = mapped_column(String(10))
    motivo_estado: Mapped[Optional[str]] = mapped_column(String(255))
    ultimo_acceso_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


class Bitacora(Base):
    __tablename__ = 'bitacora'
    __table_args__ = (
        CheckConstraint("accion::text = ANY (ARRAY['crear'::character varying, 'editar'::character varying, 'eliminar'::character varying, 'validar'::character varying, 'rechazar'::character varying, 'suspender'::character varying, 'reactivar'::character varying, 'cambiar_estado'::character varying]::text[])", name='ck_bitacora_accion'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='SET NULL', name='bitacora_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='bitacora_pkey'),
        Index('ix_bitacora_entidad', 'entidad', 'entidad_id')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    accion: Mapped[str] = mapped_column(String(20), nullable=False)
    entidad: Mapped[str] = mapped_column(String(40), nullable=False)
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    entidad_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    valor_anterior: Mapped[Optional[dict]] = mapped_column(JSONB)
    valor_nuevo: Mapped[Optional[dict]] = mapped_column(JSONB)


class Candidato(Base):
    __tablename__ = 'candidato'
    __table_args__ = (
        CheckConstraint("compartir_ajustes::text = ANY (ARRAY['preguntar'::character varying, 'siempre'::character varying, 'nunca'::character varying]::text[])", name='ck_candidato_compartir'),
        CheckConstraint('completitud >= 0 AND completitud <= 100', name='ck_candidato_completitud'),
        ForeignKeyConstraint(['jornada_id'], ['jornada.id'], name='candidato_jornada_id_fkey'),
        ForeignKeyConstraint(['municipio_id'], ['municipio.id'], name='candidato_municipio_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='CASCADE', name='candidato_usuario_id_fkey'),
        PrimaryKeyConstraint('usuario_id', name='candidato_pkey')
    )

    usuario_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    disponible_reubicacion: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    compartir_ajustes: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("'preguntar'::character varying"))
    completitud: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('0'))
    actualizado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    municipio_id: Mapped[Optional[int]] = mapped_column(Integer)
    jornada_id: Mapped[Optional[int]] = mapped_column(SmallInteger)
    resumen: Mapped[Optional[str]] = mapped_column(String(500))
    foto_url: Mapped[Optional[str]] = mapped_column(String(500))
    consentimiento_sensibles_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    nota_ajustes: Mapped[Optional[str]] = mapped_column(String(300))


class Dispositivo(Base):
    __tablename__ = 'dispositivo'
    __table_args__ = (
        CheckConstraint("plataforma::text = ANY (ARRAY['android'::character varying, 'ios'::character varying]::text[])", name='ck_dispositivo_plataforma'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='CASCADE', name='dispositivo_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='dispositivo_pkey'),
        UniqueConstraint('expo_push_token', name='dispositivo_expo_push_token_key')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expo_push_token: Mapped[str] = mapped_column(String(255), nullable=False)
    plataforma: Mapped[str] = mapped_column(String(10), nullable=False)
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))


class Empresa(Base):
    __tablename__ = 'empresa'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['pendiente'::character varying, 'validada'::character varying, 'rechazada'::character varying, 'suspendida'::character varying]::text[])", name='ck_empresa_estado'),
        CheckConstraint("rfc::text ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'::text", name='ck_empresa_rfc'),
        ForeignKeyConstraint(['municipio_id'], ['municipio.id'], name='empresa_municipio_id_fkey'),
        ForeignKeyConstraint(['sector_id'], ['sector.id'], name='empresa_sector_id_fkey'),
        ForeignKeyConstraint(['tamano_empresa_id'], ['tamano_empresa.id'], name='empresa_tamano_empresa_id_fkey'),
        ForeignKeyConstraint(['validada_por'], ['usuario.id'], name='empresa_validada_por_fkey'),
        PrimaryKeyConstraint('id', name='empresa_pkey'),
        UniqueConstraint('rfc', name='empresa_rfc_key'),
        Index('ix_empresa_estado', 'estado')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    razon_social: Mapped[str] = mapped_column(String(200), nullable=False)
    nombre_comercial: Mapped[str] = mapped_column(String(150), nullable=False)
    rfc: Mapped[str] = mapped_column(String(13), nullable=False)
    sector_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    tamano_empresa_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    municipio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False, server_default=text("'pendiente'::character varying"))
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    actualizado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    direccion: Mapped[Optional[str]] = mapped_column(String(255))
    descripcion: Mapped[Optional[str]] = mapped_column(String(1000))
    sitio_web: Mapped[Optional[str]] = mapped_column(String(255))
    logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    practicas_inclusion: Mapped[Optional[str]] = mapped_column(String(1000))
    documento_url: Mapped[Optional[str]] = mapped_column(String(500))
    motivo_estado: Mapped[Optional[str]] = mapped_column(String(255))
    validada_por: Mapped[Optional[int]] = mapped_column(BigInteger)
    validada_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


class Notificacion(Base):
    __tablename__ = 'notificacion'
    __table_args__ = (
        CheckConstraint("tipo::text = ANY (ARRAY['cambio_estado'::character varying, 'nueva_postulacion'::character varying, 'entrevista_agendada'::character varying, 'entrevista_cancelada'::character varying, 'recordatorio_entrevista'::character varying, 'empresa_validada'::character varying, 'empresa_rechazada'::character varying, 'vacante_suspendida'::character varying, 'vacante_actualizada'::character varying, 'reporte_resuelto'::character varying]::text[])", name='ck_notificacion_tipo'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='CASCADE', name='notificacion_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='notificacion_pkey'),
        Index('ix_notificacion_usuario', 'usuario_id', 'leida', 'creado_en')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    titulo: Mapped[str] = mapped_column(String(120), nullable=False)
    mensaje: Mapped[str] = mapped_column(String(300), nullable=False)
    leida: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    referencia_tipo: Mapped[Optional[str]] = mapped_column(String(20))
    referencia_id: Mapped[Optional[int]] = mapped_column(BigInteger)


class PreferenciaNotificacion(Base):
    __tablename__ = 'preferencia_notificacion'
    __table_args__ = (
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='CASCADE', name='preferencia_notificacion_usuario_id_fkey'),
        PrimaryKeyConstraint('usuario_id', 'tipo', name='preferencia_notificacion_pkey')
    )

    usuario_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(30), primary_key=True)
    push: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    correo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class TokenRecuperacion(Base):
    __tablename__ = 'token_recuperacion'
    __table_args__ = (
        CheckConstraint('intentos >= 0 AND intentos <= 5', name='ck_token_intentos'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='CASCADE', name='token_recuperacion_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='token_recuperacion_pkey')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    codigo_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    intentos: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('0'))
    expira_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usado_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


t_candidato_categoria = Table(
    'candidato_categoria', Base.metadata,
    Column('candidato_id', BigInteger, primary_key=True),
    Column('categoria_id', SmallInteger, primary_key=True),
    ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], ondelete='CASCADE', name='candidato_categoria_candidato_id_fkey'),
    ForeignKeyConstraint(['categoria_id'], ['categoria.id'], name='candidato_categoria_categoria_id_fkey'),
    PrimaryKeyConstraint('candidato_id', 'categoria_id', name='candidato_categoria_pkey')
)


class CandidatoHabilidad(Base):
    __tablename__ = 'candidato_habilidad'
    __table_args__ = (
        CheckConstraint("nivel::text = ANY (ARRAY['basico'::character varying, 'intermedio'::character varying, 'avanzado'::character varying]::text[])", name='ck_candidato_habilidad_nivel'),
        ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], ondelete='CASCADE', name='candidato_habilidad_candidato_id_fkey'),
        ForeignKeyConstraint(['habilidad_id'], ['habilidad.id'], name='candidato_habilidad_habilidad_id_fkey'),
        PrimaryKeyConstraint('candidato_id', 'habilidad_id', name='candidato_habilidad_pkey')
    )

    candidato_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    habilidad_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nivel: Mapped[str] = mapped_column(String(12), nullable=False)


t_candidato_modalidad = Table(
    'candidato_modalidad', Base.metadata,
    Column('candidato_id', BigInteger, primary_key=True),
    Column('modalidad_id', SmallInteger, primary_key=True),
    ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], ondelete='CASCADE', name='candidato_modalidad_candidato_id_fkey'),
    ForeignKeyConstraint(['modalidad_id'], ['modalidad.id'], name='candidato_modalidad_modalidad_id_fkey'),
    PrimaryKeyConstraint('candidato_id', 'modalidad_id', name='candidato_modalidad_pkey')
)


t_candidato_necesidad = Table(
    'candidato_necesidad', Base.metadata,
    Column('candidato_id', BigInteger, primary_key=True),
    Column('ajuste_id', SmallInteger, primary_key=True),
    ForeignKeyConstraint(['ajuste_id'], ['ajuste.id'], name='candidato_necesidad_ajuste_id_fkey'),
    ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], ondelete='CASCADE', name='candidato_necesidad_candidato_id_fkey'),
    PrimaryKeyConstraint('candidato_id', 'ajuste_id', name='candidato_necesidad_pkey')
)


class Experiencia(Base):
    __tablename__ = 'experiencia'
    __table_args__ = (
        CheckConstraint('NOT (actual AND fecha_fin IS NOT NULL)', name='ck_experiencia_actual'),
        CheckConstraint('fecha_fin IS NULL OR fecha_fin >= fecha_inicio', name='ck_experiencia_fechas'),
        ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], ondelete='CASCADE', name='experiencia_candidato_id_fkey'),
        PrimaryKeyConstraint('id', name='experiencia_pkey'),
        Index('ix_experiencia_candidato', 'candidato_id')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    candidato_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    puesto: Mapped[str] = mapped_column(String(100), nullable=False)
    empresa: Mapped[str] = mapped_column(String(120), nullable=False)
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    actual: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    fecha_fin: Mapped[Optional[datetime.date]] = mapped_column(Date)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500))


class Formacion(Base):
    __tablename__ = 'formacion'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['concluida'::character varying, 'en_curso'::character varying, 'trunca'::character varying]::text[])", name='ck_formacion_estado'),
        CheckConstraint('fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio', name='ck_formacion_fechas'),
        ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], ondelete='CASCADE', name='formacion_candidato_id_fkey'),
        ForeignKeyConstraint(['nivel_educativo_id'], ['nivel_educativo.id'], name='formacion_nivel_educativo_id_fkey'),
        PrimaryKeyConstraint('id', name='formacion_pkey'),
        Index('ix_formacion_candidato', 'candidato_id')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    candidato_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    nivel_educativo_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    institucion: Mapped[str] = mapped_column(String(150), nullable=False)
    estado: Mapped[str] = mapped_column(String(10), nullable=False)
    carrera: Mapped[Optional[str]] = mapped_column(String(150))
    fecha_inicio: Mapped[Optional[datetime.date]] = mapped_column(Date)
    fecha_fin: Mapped[Optional[datetime.date]] = mapped_column(Date)


class Reclutador(Base):
    __tablename__ = 'reclutador'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['empresa.id'], name='reclutador_empresa_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='CASCADE', name='reclutador_usuario_id_fkey'),
        PrimaryKeyConstraint('usuario_id', name='reclutador_pkey'),
        Index('ix_reclutador_empresa', 'empresa_id')
    )

    usuario_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    puesto: Mapped[str] = mapped_column(String(100), nullable=False)


class Vacante(Base):
    __tablename__ = 'vacante'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['borrador'::character varying, 'publicada'::character varying, 'pausada'::character varying, 'cerrada'::character varying, 'suspendida'::character varying]::text[])", name='ck_vacante_estado'),
        CheckConstraint('experiencia_anios >= 0 AND experiencia_anios <= 50', name='ck_vacante_experiencia'),
        CheckConstraint('plazas >= 1', name='ck_vacante_plazas'),
        CheckConstraint('salario_min IS NULL OR salario_max IS NULL OR salario_max >= salario_min', name='ck_vacante_salario'),
        ForeignKeyConstraint(['categoria_id'], ['categoria.id'], name='vacante_categoria_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresa.id'], name='vacante_empresa_id_fkey'),
        ForeignKeyConstraint(['jornada_id'], ['jornada.id'], name='vacante_jornada_id_fkey'),
        ForeignKeyConstraint(['modalidad_id'], ['modalidad.id'], name='vacante_modalidad_id_fkey'),
        ForeignKeyConstraint(['municipio_id'], ['municipio.id'], name='vacante_municipio_id_fkey'),
        ForeignKeyConstraint(['nivel_educativo_id'], ['nivel_educativo.id'], name='vacante_nivel_educativo_id_fkey'),
        ForeignKeyConstraint(['reclutador_id'], ['reclutador.usuario_id'], name='vacante_reclutador_id_fkey'),
        ForeignKeyConstraint(['tipo_contrato_id'], ['tipo_contrato.id'], name='vacante_tipo_contrato_id_fkey'),
        PrimaryKeyConstraint('id', name='vacante_pkey'),
        Index('ix_vacante_busqueda', 'estado', 'categoria_id', 'modalidad_id', 'municipio_id'),
        Index('ix_vacante_empresa', 'empresa_id')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    empresa_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reclutador_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    categoria_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    modalidad_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    jornada_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    tipo_contrato_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    municipio_id: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(2000), nullable=False)
    plazas: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('1'))
    mostrar_salario: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    experiencia_anios: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('0'))
    sin_condiciones_accesibilidad: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    estado: Mapped[str] = mapped_column(String(12), nullable=False, server_default=text("'borrador'::character varying"))
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    actualizado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    nivel_educativo_id: Mapped[Optional[int]] = mapped_column(SmallInteger)
    direccion: Mapped[Optional[str]] = mapped_column(String(255))
    salario_min: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    salario_max: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    notas_accesibilidad: Mapped[Optional[str]] = mapped_column(String(500))
    motivo_estado: Mapped[Optional[str]] = mapped_column(String(255))
    publicada_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


class Compatibilidad(Base):
    __tablename__ = 'compatibilidad'
    __table_args__ = (
        CheckConstraint('componente_h >= 0::numeric AND componente_h <= 1::numeric AND componente_a >= 0::numeric AND componente_a <= 1::numeric AND componente_m >= 0::numeric AND componente_m <= 1::numeric AND componente_f >= 0::numeric AND componente_f <= 1::numeric', name='ck_compat_componentes'),
        CheckConstraint('puntaje_candidato >= 0 AND puntaje_candidato <= 100 AND puntaje_reclutador >= 0 AND puntaje_reclutador <= 100', name='ck_compat_puntajes'),
        ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], ondelete='CASCADE', name='compatibilidad_candidato_id_fkey'),
        ForeignKeyConstraint(['vacante_id'], ['vacante.id'], ondelete='CASCADE', name='compatibilidad_vacante_id_fkey'),
        PrimaryKeyConstraint('candidato_id', 'vacante_id', name='compatibilidad_pkey'),
        Index('ix_compatibilidad_candidato', 'candidato_id', 'puntaje_candidato'),
        Index('ix_compatibilidad_vacante', 'vacante_id', 'puntaje_reclutador')
    )

    candidato_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    vacante_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    puntaje_candidato: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    puntaje_reclutador: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    componente_h: Mapped[decimal.Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    componente_a: Mapped[decimal.Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    componente_m: Mapped[decimal.Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    componente_f: Mapped[decimal.Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    calculado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))


class HorarioEntrevista(Base):
    __tablename__ = 'horario_entrevista'
    __table_args__ = (
        CheckConstraint('duracion_min = ANY (ARRAY[30, 45, 60])', name='ck_horario_duracion'),
        CheckConstraint("estado::text = ANY (ARRAY['libre'::character varying, 'agendado'::character varying, 'cancelado'::character varying]::text[])", name='ck_horario_estado'),
        CheckConstraint("liga::text ~ '^https://(meet\\.google\\.com|teams\\.microsoft\\.com|teams\\.live\\.com)/'::text", name='ck_horario_liga'),
        ForeignKeyConstraint(['reclutador_id'], ['reclutador.usuario_id'], name='horario_entrevista_reclutador_id_fkey'),
        ForeignKeyConstraint(['vacante_id'], ['vacante.id'], ondelete='CASCADE', name='horario_entrevista_vacante_id_fkey'),
        PrimaryKeyConstraint('id', name='horario_entrevista_pkey'),
        Index('ix_horario_vacante', 'vacante_id', 'inicio')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    vacante_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reclutador_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inicio: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    duracion_min: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    liga: Mapped[str] = mapped_column(String(500), nullable=False)
    estado: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("'libre'::character varying"))
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))


class Postulacion(Base):
    __tablename__ = 'postulacion'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['postulada'::character varying, 'en_revision'::character varying, 'entrevista'::character varying, 'aceptada'::character varying, 'no_seleccionada'::character varying, 'retirada'::character varying]::text[])", name='ck_postulacion_estado'),
        ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], name='postulacion_candidato_id_fkey'),
        ForeignKeyConstraint(['vacante_id'], ['vacante.id'], name='postulacion_vacante_id_fkey'),
        PrimaryKeyConstraint('id', name='postulacion_pkey'),
        UniqueConstraint('candidato_id', 'vacante_id', name='uq_postulacion'),
        Index('ix_postulacion_vacante', 'vacante_id', 'estado')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    candidato_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vacante_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    estado: Mapped[str] = mapped_column(String(16), nullable=False, server_default=text("'postulada'::character varying"))
    comparte_ajustes: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    actualizado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    mensaje: Mapped[Optional[str]] = mapped_column(String(500))


class Reporte(Base):
    __tablename__ = 'reporte'
    __table_args__ = (
        CheckConstraint("(estado::text <> ALL (ARRAY['resuelto'::character varying, 'descartado'::character varying]::text[])) OR resolucion IS NOT NULL AND cerrado_en IS NOT NULL", name='ck_reporte_cierre'),
        CheckConstraint("accion IS NULL OR (accion::text = ANY (ARRAY['ninguna'::character varying, 'suspension'::character varying]::text[]))", name='ck_reporte_accion'),
        CheckConstraint("estado::text = ANY (ARRAY['abierto'::character varying, 'en_revision'::character varying, 'resuelto'::character varying, 'descartado'::character varying]::text[])", name='ck_reporte_estado'),
        CheckConstraint('num_nonnulls(vacante_id, empresa_id, candidato_id) = 1', name='ck_reporte_objeto'),
        ForeignKeyConstraint(['atendido_por'], ['usuario.id'], name='reporte_atendido_por_fkey'),
        ForeignKeyConstraint(['candidato_id'], ['candidato.usuario_id'], name='reporte_candidato_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['empresa.id'], name='reporte_empresa_id_fkey'),
        ForeignKeyConstraint(['motivo_reporte_id'], ['motivo_reporte.id'], name='reporte_motivo_reporte_id_fkey'),
        ForeignKeyConstraint(['reportante_id'], ['usuario.id'], name='reporte_reportante_id_fkey'),
        ForeignKeyConstraint(['vacante_id'], ['vacante.id'], name='reporte_vacante_id_fkey'),
        PrimaryKeyConstraint('id', name='reporte_pkey'),
        Index('ix_reporte_estado', 'estado', 'creado_en')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    reportante_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    motivo_reporte_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False, server_default=text("'abierto'::character varying"))
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    vacante_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    empresa_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    candidato_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500))
    resolucion: Mapped[Optional[str]] = mapped_column(String(1000))
    accion: Mapped[Optional[str]] = mapped_column(String(12))
    atendido_por: Mapped[Optional[int]] = mapped_column(BigInteger)
    cerrado_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


class VacanteAjuste(Base):
    __tablename__ = 'vacante_ajuste'
    __table_args__ = (
        CheckConstraint("tipo::text = ANY (ARRAY['existente'::character varying, 'bajo_solicitud'::character varying]::text[])", name='ck_vacante_ajuste_tipo'),
        ForeignKeyConstraint(['ajuste_id'], ['ajuste.id'], name='vacante_ajuste_ajuste_id_fkey'),
        ForeignKeyConstraint(['vacante_id'], ['vacante.id'], ondelete='CASCADE', name='vacante_ajuste_vacante_id_fkey'),
        PrimaryKeyConstraint('vacante_id', 'ajuste_id', name='vacante_ajuste_pkey')
    )

    vacante_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ajuste_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(15), nullable=False)


class VacanteHabilidad(Base):
    __tablename__ = 'vacante_habilidad'
    __table_args__ = (
        ForeignKeyConstraint(['habilidad_id'], ['habilidad.id'], name='vacante_habilidad_habilidad_id_fkey'),
        ForeignKeyConstraint(['vacante_id'], ['vacante.id'], ondelete='CASCADE', name='vacante_habilidad_vacante_id_fkey'),
        PrimaryKeyConstraint('vacante_id', 'habilidad_id', name='vacante_habilidad_pkey')
    )

    vacante_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    habilidad_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    obligatoria: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))


class Entrevista(Base):
    __tablename__ = 'entrevista'
    __table_args__ = (
        CheckConstraint("estado::text = ANY (ARRAY['agendada'::character varying, 'realizada'::character varying, 'no_asistio'::character varying, 'cancelada'::character varying]::text[])", name='ck_entrevista_estado'),
        ForeignKeyConstraint(['cancelada_por'], ['usuario.id'], name='entrevista_cancelada_por_fkey'),
        ForeignKeyConstraint(['horario_id'], ['horario_entrevista.id'], name='entrevista_horario_id_fkey'),
        ForeignKeyConstraint(['postulacion_id'], ['postulacion.id'], ondelete='CASCADE', name='entrevista_postulacion_id_fkey'),
        PrimaryKeyConstraint('id', name='entrevista_pkey'),
        Index('uq_entrevista_horario_vigente', 'horario_id', postgresql_where="((estado)::text <> 'cancelada'::text)", unique=True)
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    horario_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    postulacion_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False, server_default=text("'agendada'::character varying"))
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    motivo_cancelacion: Mapped[Optional[str]] = mapped_column(String(255))
    cancelada_por: Mapped[Optional[int]] = mapped_column(BigInteger)
    recordatorio_en: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


class HistorialPostulacion(Base):
    __tablename__ = 'historial_postulacion'
    __table_args__ = (
        ForeignKeyConstraint(['postulacion_id'], ['postulacion.id'], ondelete='CASCADE', name='historial_postulacion_postulacion_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='SET NULL', name='historial_postulacion_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='historial_postulacion_pkey'),
        Index('ix_historial_postulacion', 'postulacion_id', 'creado_en')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    postulacion_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    estado_nuevo: Mapped[str] = mapped_column(String(16), nullable=False)
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    estado_anterior: Mapped[Optional[str]] = mapped_column(String(16))
    mensaje: Mapped[Optional[str]] = mapped_column(String(500))


class HistorialReporte(Base):
    __tablename__ = 'historial_reporte'
    __table_args__ = (
        ForeignKeyConstraint(['reporte_id'], ['reporte.id'], ondelete='CASCADE', name='historial_reporte_reporte_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='SET NULL', name='historial_reporte_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='historial_reporte_pkey')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    reporte_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    estado_nuevo: Mapped[str] = mapped_column(String(12), nullable=False)
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    estado_anterior: Mapped[Optional[str]] = mapped_column(String(12))
    comentario: Mapped[Optional[str]] = mapped_column(String(500))


class Observacion(Base):
    __tablename__ = 'observacion'
    __table_args__ = (
        ForeignKeyConstraint(['autor_id'], ['reclutador.usuario_id'], name='observacion_autor_id_fkey'),
        ForeignKeyConstraint(['postulacion_id'], ['postulacion.id'], ondelete='CASCADE', name='observacion_postulacion_id_fkey'),
        PrimaryKeyConstraint('id', name='observacion_pkey')
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True, start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True, autoincrement=True)
    postulacion_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    autor_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    texto: Mapped[str] = mapped_column(String(1000), nullable=False)
    creado_en: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))


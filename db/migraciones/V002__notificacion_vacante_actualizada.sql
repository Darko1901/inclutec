-- =====================================================================
-- IncluTec — V002: nuevo tipo de notificación «vacante_actualizada»
-- Contrato v1.2: avisa a los postulados activos cuando el reclutador cambia
-- habilidades, formación, modalidad o ajustes de la vacante.
-- =====================================================================

ALTER TABLE notificacion DROP CONSTRAINT ck_notificacion_tipo;
ALTER TABLE notificacion ADD CONSTRAINT ck_notificacion_tipo CHECK (tipo IN (
    'cambio_estado', 'nueva_postulacion', 'entrevista_agendada', 'entrevista_cancelada',
    'recordatorio_entrevista', 'empresa_validada', 'empresa_rechazada', 'vacante_suspendida',
    'vacante_actualizada', 'reporte_resuelto'
));

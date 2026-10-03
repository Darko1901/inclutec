-- Pruebas de restricciones: cada bloque DEBE fallar; se reporta el resultado.
\set ON_ERROR_STOP 0
\echo '--- 1. Postulación duplicada (debe fallar: uq_postulacion)'
INSERT INTO postulacion (candidato_id, vacante_id) VALUES (3, 1);
\echo '--- 2. Doble reservación de un horario (debe fallar: uq_entrevista_horario_vigente)'
INSERT INTO entrevista (horario_id, postulacion_id) VALUES (1, 1);
\echo '--- 3. Reporte sin objeto o con dos objetos (debe fallar: ck_reporte_objeto)'
INSERT INTO reporte (reportante_id, motivo_reporte_id, vacante_id, empresa_id) VALUES (3, 1, 1, 1);
\echo '--- 4. Cerrar reporte sin resolución (debe fallar: ck_reporte_cierre)'
INSERT INTO reporte (reportante_id, motivo_reporte_id, vacante_id, estado) VALUES (3, 3, 1, 'resuelto');
\echo '--- 5. RFC inválido (debe fallar: ck_empresa_rfc)'
INSERT INTO empresa (razon_social, nombre_comercial, rfc, sector_id, tamano_empresa_id, municipio_id) VALUES ('X', 'X', '123', 1, 1, 1);
\echo '--- 6. Liga de entrevista fuera de Meet/Teams (debe fallar: ck_horario_liga)'
INSERT INTO horario_entrevista (vacante_id, reclutador_id, inicio, duracion_min, liga) VALUES (1, 2, now(), 30, 'https://zoom.us/j/1');
\echo '--- 7. Experiencia con fecha fin anterior al inicio (debe fallar: ck_experiencia_fechas)'
INSERT INTO experiencia (candidato_id, puesto, empresa, fecha_inicio, fecha_fin) VALUES (3, 'X', 'X', '2025-01-01', '2024-01-01');
\echo '--- 8. Estado de postulación inexistente (debe fallar: ck_postulacion_estado)'
UPDATE postulacion SET estado = 'contratada' WHERE id = 1;
\echo '--- 9. Cancelar entrevista y volver a reservar el mismo horario (debe FUNCIONAR)'
UPDATE entrevista SET estado = 'cancelada', motivo_cancelacion = 'Prueba', cancelada_por = 3 WHERE id = 1;
INSERT INTO entrevista (horario_id, postulacion_id) VALUES (1, 1);
SELECT 'ok: re-reservación tras cancelar' AS resultado, count(*) AS entrevistas_en_horario_1 FROM entrevista WHERE horario_id = 1;

-- =====================================================================
-- IncluTec — Datos de prueba (solo desarrollo)
-- Cuentas:  admin@inclutec.mx (administrador) · rh@tecnoqro.mx (reclutador)
--           mariana.lopez@correo.mx y jorge.ramirez@correo.mx (candidatos)
-- Contraseña de todas: Inclutec2026
-- Son los mismos datos que usan los mocks de la app móvil y del panel web.
-- =====================================================================
BEGIN;

-- Usuarios de prueba. Contraseña de todas las cuentas: Inclutec2026 (hash bcrypt real, cost 12)
INSERT INTO usuario (rol_id, correo, contrasena_hash, nombre, apellidos, telefono, acepto_aviso_en) VALUES
 (3, 'admin@inclutec.mx', '$2b$12$vEmbOGVnqmX2QYD5ezJBTuDy37c7S5nphdnYfH.Q5fDmfp1VmtBqW', 'Admin', 'IncluTec', NULL, now()),
 (2, 'rh@tecnoqro.mx', '$2b$12$VL.CJf9Dv3nWSvSNH3m5uebvRqF09UdgNjwixJfEElCClLwa5QmDe', 'Laura', 'Hernández Ruiz', '4421234567', now()),
 (1, 'mariana.lopez@correo.mx', '$2b$12$pU.kcDN/wXLfGpjh3dhXSeapDQHnVxad/xmMmsZTyEO02AKl.rEqm', 'Mariana', 'López García', '4427654321', now()),
 (1, 'jorge.ramirez@correo.mx', '$2b$12$7Rq33OZPnZoDFIsWaXe1KuyEPpNCqOLk/sufH.jCU53rMVXymOi0O', 'Jorge', 'Ramírez Soto', '4421112233', now());

INSERT INTO empresa (razon_social, nombre_comercial, rfc, sector_id, tamano_empresa_id, municipio_id, direccion,
                     descripcion, practicas_inclusion, estado, validada_por, validada_en) VALUES
 ('Tecnologías Querétaro S.A. de C.V.', 'TecnoQro', 'TQU150312AB1', 4, 3, 3, 'Av. Constituyentes 100, Querétaro',
  'Empresa de desarrollo de software y soporte técnico.', 'Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.',
  'validada', 1, now());

INSERT INTO reclutador (usuario_id, empresa_id, puesto) VALUES (2, 1, 'Coordinadora de Recursos Humanos');

INSERT INTO candidato (usuario_id, municipio_id, jornada_id, resumen, consentimiento_sensibles_en, compartir_ajustes, completitud) VALUES
 (3, 2, 1, 'Técnica en sistemas con experiencia en soporte y atención a usuarios.', now(), 'preguntar', 90),
 (4, 3, 1, 'Analista de datos en formación.', NULL, 'nunca', 80);

INSERT INTO candidato_modalidad VALUES (3, 2), (3, 3), (4, 1);
INSERT INTO candidato_categoria VALUES (3, 1), (4, 1), (4, 2);
INSERT INTO experiencia (candidato_id, puesto, empresa, fecha_inicio, fecha_fin, actual, descripcion) VALUES
 (3, 'Auxiliar de soporte técnico', 'Servicios Integrales del Bajío', '2023-02-01', '2025-06-30', FALSE, 'Atención de tickets y mantenimiento de equipos.');
INSERT INTO formacion (candidato_id, nivel_educativo_id, institucion, carrera, estado, fecha_inicio, fecha_fin) VALUES
 (3, 4, 'Universidad Tecnológica de Querétaro', 'TSU en Tecnologías de la Información', 'concluida', '2020-09-01', '2022-08-31'),
 (4, 5, 'Universidad Politécnica de Querétaro', 'Ingeniería en Sistemas Computacionales', 'en_curso', '2023-09-01', NULL);
INSERT INTO candidato_habilidad VALUES (3, 4, 'avanzado'), (3, 5, 'intermedio'), (3, 6, 'basico'), (3, 11, 'avanzado'),
                                       (4, 1, 'intermedio'), (4, 3, 'intermedio'), (4, 6, 'avanzado');
INSERT INTO candidato_necesidad VALUES (3, 1), (3, 3);

INSERT INTO vacante (empresa_id, reclutador_id, categoria_id, modalidad_id, jornada_id, tipo_contrato_id, nivel_educativo_id,
                     municipio_id, titulo, descripcion, plazas, direccion, salario_min, salario_max, mostrar_salario,
                     experiencia_anios, estado, publicada_en) VALUES
 (1, 2, 1, 3, 1, 1, 4, 3, 'Técnico de soporte de TI', 'Atención a usuarios internos, mantenimiento de equipos y redes.', 2,
  'Av. Constituyentes 100, Querétaro', 14000, 18000, TRUE, 1, 'publicada', now());

INSERT INTO vacante_habilidad VALUES (1, 4, TRUE), (1, 5, TRUE), (1, 3, TRUE), (1, 11, TRUE), (1, 2, FALSE), (1, 6, FALSE);
INSERT INTO vacante_ajuste VALUES (1, 1, 'existente'), (1, 3, 'existente'), (1, 12, 'bajo_solicitud');

-- Ejemplo del reporte (sección 4.1.1): H = (2·3+1)/(2·4+2) = 0.70, A = 1, M = 1, F = 1 → 88 / 83
INSERT INTO compatibilidad VALUES (3, 1, 88, 83, 0.700, 1.000, 1.000, 1.000, now());

INSERT INTO postulacion (candidato_id, vacante_id, estado, mensaje, comparte_ajustes) VALUES
 (3, 1, 'entrevista', 'Me interesa mucho el puesto; tengo experiencia en soporte.', TRUE);
INSERT INTO historial_postulacion (postulacion_id, usuario_id, estado_anterior, estado_nuevo, mensaje) VALUES
 (1, 3, NULL, 'postulada', NULL), (1, 2, 'postulada', 'en_revision', NULL), (1, 2, 'en_revision', 'entrevista', 'Nos gustaría conocerte; agenda un horario.');
INSERT INTO observacion (postulacion_id, autor_id, texto) VALUES (1, 2, 'Perfil sólido en soporte; confirmar disponibilidad de horario.');

INSERT INTO horario_entrevista (vacante_id, reclutador_id, inicio, duracion_min, liga, estado) VALUES
 (1, 2, now() + interval '3 days', 45, 'https://meet.google.com/abc-defg-hij', 'agendado'),
 (1, 2, now() + interval '3 days 1 hour', 45, 'https://meet.google.com/abc-defg-hij', 'libre');
INSERT INTO entrevista (horario_id, postulacion_id) VALUES (1, 1);

INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, referencia_tipo, referencia_id) VALUES
 (3, 'cambio_estado', 'Tu postulación avanzó', 'Tu postulación a Técnico de soporte de TI pasó a Entrevista.', 'postulacion', 1),
 (2, 'entrevista_agendada', 'Nueva entrevista', 'Se agendó una entrevista para Técnico de soporte de TI.', 'entrevista', 1);

COMMIT;

-- =====================================================================
-- IncluTec — Datos de prueba (solo desarrollo)
-- Cuentas:  admin@inclutec.mx (administrador) · rh@tecnoqro.mx, rh@logibajio.mx, talento@concentro.mx,
--           contacto@estudiotrazo.mx (reclutadores; la última empresa está pendiente de validar)
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

-- Ejemplo del reporte (sección 4.1.1): H = (2·3+1)/(2·4+2) = 0.70, A = 1, M = 1, F = 1 → 88 / 83.
-- La compatibilidad de todas las vacantes publicadas se inserta al final, en la ampliación.

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

-- ---------------------------------------------------------------------
-- Ampliación (P03): más empresas y vacantes para probar búsqueda, filtros,
-- validación de empresas y moderación. Contraseña de las cuentas nuevas: Inclutec2026
-- ---------------------------------------------------------------------
INSERT INTO usuario (rol_id, correo, contrasena_hash, nombre, apellidos, telefono, acepto_aviso_en) VALUES
 (2, 'rh@logibajio.mx', '$2b$12$VL.CJf9Dv3nWSvSNH3m5uebvRqF09UdgNjwixJfEElCClLwa5QmDe', 'Roberto', 'Sánchez Mejía', '4422345678', now()),
 (2, 'talento@concentro.mx', '$2b$12$VL.CJf9Dv3nWSvSNH3m5uebvRqF09UdgNjwixJfEElCClLwa5QmDe', 'Patricia', 'Núñez Ortega', '4423456789', now()),
 (2, 'contacto@estudiotrazo.mx', '$2b$12$VL.CJf9Dv3nWSvSNH3m5uebvRqF09UdgNjwixJfEElCClLwa5QmDe', 'Daniel', 'Ortiz Vega', '4424567890', now());

INSERT INTO empresa (razon_social, nombre_comercial, rfc, sector_id, tamano_empresa_id, municipio_id, direccion,
                     descripcion, practicas_inclusion, estado, validada_por, validada_en) VALUES
 ('Logística Bajío Norte S.A. de C.V.', 'LogiBajío', 'LBN180725KQ3', 1, 4, 2, 'Parque Industrial Bernardo Quintana, El Marqués',
  'Centro de distribución y logística para la industria automotriz.', 'Almacén con rampas y alertas visuales; convenio con una asociación de personas sordas.',
  'validada', 1, now()),
 ('Contadores Asociados del Centro S.C.', 'ConCentro', 'CAC0904158T2', 3, 2, 1, 'Calle Josefa Vergara 25, Corregidora',
  'Despacho contable con clientes pymes de la región.', 'Trabajo remoto y comunicación por escrito para todo el equipo.',
  'validada', 1, now()),
 ('Estudio Trazo Diseño S.A.S.', 'Estudio Trazo', 'ETR2101119P4', 3, 1, 3, 'Calle 5 de Mayo 40, Centro, Querétaro',
  'Estudio de diseño gráfico e ilustración.', NULL, 'pendiente', NULL, NULL);

INSERT INTO reclutador (usuario_id, empresa_id, puesto) VALUES
 (5, 2, 'Jefe de Recursos Humanos'), (6, 3, 'Coordinadora de Talento'), (7, 4, 'Director creativo');

INSERT INTO vacante (empresa_id, reclutador_id, categoria_id, modalidad_id, jornada_id, tipo_contrato_id, nivel_educativo_id,
                     municipio_id, titulo, descripcion, plazas, direccion, salario_min, salario_max, mostrar_salario,
                     experiencia_anios, sin_condiciones_accesibilidad, notas_accesibilidad, estado, publicada_en) VALUES
 (2, 5, 5, 1, 1, 1, 3, 2, 'Auxiliar de almacén', 'Recepción, acomodo y surtido de mercancía con apoyo de terminal portátil.', 3,
  'Parque Industrial Bernardo Quintana, El Marqués', 9500, 11000, TRUE, 0, FALSE, 'Pasillos de 1.5 m y estaciones de trabajo a dos alturas.', 'publicada', now() - interval '2 days'),
 (2, 5, 1, 3, 1, 1, 5, 2, 'Analista de datos de operaciones', 'Reportes de inventario y tableros de indicadores para el área de operaciones.', 1,
  'Parque Industrial Bernardo Quintana, El Marqués', 16000, 21000, TRUE, 1, FALSE, NULL, 'publicada', now() - interval '5 days'),
 (3, 6, 2, 2, 2, 2, 4, 1, 'Auxiliar contable', 'Registro de pólizas, conciliaciones bancarias y emisión de facturas.', 1,
  NULL, 8000, 9000, FALSE, 1, FALSE, NULL, 'publicada', now() - interval '1 day'),
 (3, 6, 3, 1, 1, 1, 3, 1, 'Ejecutivo de atención telefónica', 'Atención de llamadas de clientes y registro de casos en el CRM.', 2,
  'Calle Josefa Vergara 25, Corregidora', 10000, 12000, TRUE, 0, TRUE, NULL, 'publicada', now() - interval '8 days'),
 (1, 2, 1, 2, 1, 1, 5, 3, 'Desarrollador web junior', 'Desarrollo y mantenimiento de aplicaciones web internas.', 1,
  NULL, 15000, 20000, TRUE, 0, FALSE, NULL, 'publicada', now() - interval '3 days'),
 (1, 2, 4, 3, 2, 3, NULL, 3, 'Diseñador gráfico', 'Material gráfico para redes sociales y presentaciones.', 1,
  NULL, NULL, NULL, FALSE, 0, FALSE, NULL, 'borrador', NULL),
 (4, 7, 4, 2, 3, 3, NULL, 3, 'Ilustrador digital', 'Ilustraciones para proyectos editoriales.', 1,
  NULL, NULL, NULL, FALSE, 1, FALSE, NULL, 'borrador', NULL);

INSERT INTO vacante_habilidad VALUES
 (2, 14, TRUE), (2, 15, FALSE), (2, 6, FALSE),
 (3, 3, TRUE), (3, 1, TRUE), (3, 6, TRUE), (3, 14, FALSE),
 (4, 7, TRUE), (4, 8, TRUE), (4, 6, TRUE),
 (5, 9, TRUE), (5, 10, FALSE), (5, 11, FALSE),
 (6, 2, TRUE), (6, 3, FALSE), (6, 1, FALSE),
 (7, 12, TRUE), (7, 13, FALSE),
 (8, 12, TRUE);
INSERT INTO vacante_ajuste VALUES
 (2, 1, 'existente'), (2, 2, 'existente'), (2, 3, 'existente'), (2, 8, 'existente'), (2, 6, 'bajo_solicitud'),
 (3, 4, 'existente'), (3, 5, 'existente'), (3, 12, 'bajo_solicitud'),
 (4, 13, 'existente'), (4, 7, 'existente'), (4, 10, 'existente'),
 (6, 4, 'existente'), (6, 9, 'existente'), (6, 12, 'existente'), (6, 6, 'bajo_solicitud');

-- Compatibilidad de los dos candidatos con las vacantes publicadas (verificada con pruebas/P002)
INSERT INTO compatibilidad VALUES
 (3, 1, 88, 83, 0.700, 1.000, 1.000, 1.000, now()),
 (3, 2, 55, 36, 0.250, 1.000, 0.000, 1.000, now()),
 (3, 3, 26, 38, 0.286, 0.000, 1.000, 0.000, now()),
 (3, 4, 43, 62, 0.333, 0.000, 1.000, 1.000, now()),
 (3, 5, 25, 36, 0.250, 0.000, 0.000, 1.000, now()),
 (3, 6, 15, 21, 0.000, 0.000, 1.000, 0.000, now()),
 (4, 1, 57, 39, 0.300, 1.000, 0.500, 0.500, now()),
 (4, 2, 63, 46, 0.250, 1.000, 1.000, 0.500, now()),
 (4, 3, 79, 70, 0.857, 1.000, 0.500, 0.500, now()),
 (4, 4, 51, 30, 0.333, 1.000, 0.000, 0.500, now()),
 (4, 5, 53, 32, 0.000, 1.000, 1.000, 0.500, now()),
 (4, 6, 58, 39, 0.500, 1.000, 0.000, 0.500, now());

INSERT INTO postulacion (candidato_id, vacante_id, estado, mensaje, comparte_ajustes) VALUES
 (4, 3, 'postulada', 'Estoy terminando Ingeniería en Sistemas y manejo SQL y Python.', FALSE);
INSERT INTO historial_postulacion (postulacion_id, usuario_id, estado_anterior, estado_nuevo, mensaje) VALUES
 (2, 4, NULL, 'postulada', NULL);

INSERT INTO reporte (reportante_id, motivo_reporte_id, vacante_id, descripcion) VALUES
 (4, 2, 5, 'El salario publicado no coincide con lo que me dijeron por teléfono.');
INSERT INTO historial_reporte (reporte_id, usuario_id, estado_anterior, estado_nuevo) VALUES (1, 4, NULL, 'abierto');

INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, referencia_tipo, referencia_id) VALUES
 (5, 'nueva_postulacion', 'Nueva postulación', 'Jorge Ramírez Soto se postuló a Analista de datos de operaciones.', 'postulacion', 2);

COMMIT;

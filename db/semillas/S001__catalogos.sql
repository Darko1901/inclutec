-- =====================================================================
-- IncluTec — Catálogos iniciales
-- Datos que la plataforma necesita para funcionar (roles, entidades, modalidades,
-- habilidades, ajustes razonables, motivos de reporte). Se cargan en cualquier ambiente.
-- =====================================================================
BEGIN;

INSERT INTO rol (nombre, descripcion) VALUES
 ('candidato', 'Persona con discapacidad que busca empleo'),
 ('reclutador', 'Representante de una empresa que publica vacantes'),
 ('administrador', 'Gestiona y valida la plataforma');

INSERT INTO entidad_federativa (id, nombre) VALUES
 (9, 'Ciudad de México'), (11, 'Guanajuato'), (14, 'Jalisco'), (15, 'México'), (19, 'Nuevo León'), (22, 'Querétaro');

INSERT INTO municipio (entidad_federativa_id, clave, nombre) VALUES
 (22, '006', 'Corregidora'), (22, '011', 'El Marqués'), (22, '014', 'Querétaro'), (22, '016', 'San Juan del Río'),
 (11, '020', 'León'), (14, '039', 'Guadalajara'), (19, '039', 'Monterrey'), (9, '015', 'Cuauhtémoc');

INSERT INTO modalidad (nombre) VALUES ('Presencial'), ('Remoto'), ('Híbrido');
INSERT INTO jornada (nombre) VALUES ('Tiempo completo'), ('Medio tiempo'), ('Por horas'), ('Fines de semana');
INSERT INTO tipo_contrato (nombre) VALUES ('Indefinido'), ('Temporal'), ('Por proyecto'), ('Prácticas profesionales');
INSERT INTO nivel_educativo (nombre, orden) VALUES
 ('Primaria', 1), ('Secundaria', 2), ('Bachillerato', 3), ('Técnico superior universitario', 4), ('Licenciatura', 5), ('Posgrado', 6);
INSERT INTO sector (nombre) VALUES
 ('Manufactura'), ('Comercio'), ('Servicios profesionales'), ('Tecnologías de la información'), ('Salud'), ('Educación'), ('Gobierno');
INSERT INTO tamano_empresa (nombre, rango) VALUES
 ('Micro', '1 a 10 trabajadores'), ('Pequeña', '11 a 50 trabajadores'), ('Mediana', '51 a 250 trabajadores'), ('Grande', 'Más de 250 trabajadores');

INSERT INTO categoria (nombre, descripcion) VALUES
 ('Tecnologías de la información', 'Desarrollo, soporte y administración de sistemas'),
 ('Administración', 'Gestión administrativa y contable'),
 ('Atención a clientes', 'Servicio y atención presencial o remota'),
 ('Diseño y comunicación', 'Diseño gráfico, contenidos y comunicación'),
 ('Producción y logística', 'Operación, almacén y cadena de suministro');

INSERT INTO habilidad (categoria_id, nombre) VALUES
 (1, 'Python'), (1, 'JavaScript'), (1, 'SQL'), (1, 'Soporte técnico'), (1, 'Redes'),
 (2, 'Excel'), (2, 'Contabilidad'), (2, 'Facturación electrónica'),
 (3, 'Atención telefónica'), (3, 'Manejo de CRM'), (3, 'Comunicación escrita'),
 (4, 'Diseño gráfico'), (4, 'Redacción'),
 (5, 'Control de inventarios'), (5, 'Manejo de ERP');

INSERT INTO ajuste (categoria, nombre, descripcion) VALUES
 ('movilidad', 'Acceso con rampa', 'Entrada y áreas de trabajo accesibles en silla de ruedas'),
 ('movilidad', 'Elevador', 'Acceso a pisos superiores sin escaleras'),
 ('movilidad', 'Baño accesible', 'Sanitario adaptado para personas usuarias de silla de ruedas'),
 ('visual', 'Software compatible con lector de pantalla', 'Herramientas de trabajo que funcionan con NVDA, JAWS o VoiceOver'),
 ('visual', 'Documentos en formato accesible', 'Materiales en formatos legibles por lector de pantalla o en macrotipo'),
 ('auditiva', 'Intérprete de Lengua de Señas Mexicana', 'Intérprete de LSM en reuniones y capacitaciones'),
 ('auditiva', 'Comunicación por escrito', 'Instrucciones y avisos por mensaje o correo'),
 ('auditiva', 'Alertas visuales', 'Alarmas y avisos con señal luminosa'),
 ('comunicacion', 'Subtitulado en reuniones', 'Subtítulos en videollamadas y capacitaciones'),
 ('cognitiva_psicosocial', 'Instrucciones por escrito y paso a paso', 'Tareas explicadas por escrito y en pasos claros'),
 ('cognitiva_psicosocial', 'Espacio de trabajo tranquilo', 'Área con poco ruido y pocas distracciones'),
 ('general', 'Horario flexible', 'Posibilidad de ajustar horarios de entrada y salida'),
 ('general', 'Trabajo remoto', 'Posibilidad de trabajar desde casa');

INSERT INTO motivo_reporte (nombre, aplica_a) VALUES
 ('Discriminación', 'todos'), ('Información falsa', 'todos'), ('Vacante engañosa o fraudulenta', 'vacante'),
 ('Solicitud de pago al candidato', 'vacante'), ('Contenido inapropiado', 'todos'), ('Otro', 'todos');

COMMIT;

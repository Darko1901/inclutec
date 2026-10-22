<?php

use Illuminate\Support\Str;

/*
| Datos de prueba de ApiMock: son los de db/semillas/S002__datos_prueba.sql, con la forma de los
| objetos del contrato (docs/api/contrato.md, sección 5). Son el único lugar donde viven; las
| vistas nunca los importan, siempre pasan por ApiAdmin.
|
| Las cuentas con id 100 en adelante existen solo en el mock (no están en la base de datos de
| prueba); sus ids no chocan con los de S002, que van del 1 al 7.
|
| Los grupos `catalogos`, `empresas`, `candidatos`, `vacantes`, `postulaciones` y `reportes` son lo
| que necesitan las estadísticas (WEB-02): las cifras del dashboard se calculan con ellos, no se
| escriben. Los registros con id 100 en adelante existen solo en el mock y dan volumen a las
| gráficas (varios candidatos, estados y meses). Sus fechas son relativas a hoy (`hace()`), así que
| el periodo por omisión siempre tiene datos; `inclutec:mock-reiniciar` las vuelve a calcular.
|
| Cada cuenta de `usuarios` lleva, además del objeto Usuario del contrato, una `ficha` con lo que
| solo ve el administrador (fecha de registro, último acceso, motivo del estado y puesto). Los
| usuarios 107 a 152 se generan aquí mismo para tener varias páginas de 25 en WEB-03.
|
| Lo que falta (empresas, vacantes y reportes completos) se agrega aquí en las siguientes tareas,
| cada grupo bajo su propia llave.
*/

$contrasena = 'Inclutec2026';

/** Fecha-hora UTC de hace `$dias` días, como las manda el API. */
$hace = fn (int $dias, int $hora = 15): string => now()->subDays($dias)->utc()->setTime($hora, 0)->format('Y-m-d\TH:i:s\Z');

/** Ficha del administrador: registro y último acceso en días atrás (null = nunca entró). */
$ficha = fn (int $registro, ?int $acceso = null, ?string $motivo = null, ?string $puesto = null): array => [
    'creado_en' => $hace($registro, 15),
    'ultimo_acceso_en' => $acceso === null ? null : $hace($acceso, 9),
    'motivo_estado' => $motivo,
    'puesto' => $puesto,
];

$usuario = fn (int $id, string $correo, string $nombre, string $apellidos, ?string $telefono, string $rol, string $estado = 'activo', ?array $empresa = null, ?bool $consentimiento = null, array $ficha = []): array => [
    'contrasena' => $contrasena,
    'ficha' => $ficha + ['creado_en' => null, 'ultimo_acceso_en' => null, 'motivo_estado' => null, 'puesto' => null],
    'usuario' => [
        'id' => $id,
        'correo' => $correo,
        'nombre' => $nombre,
        'apellidos' => $apellidos,
        'telefono' => $telefono,
        'rol' => $rol,
        'estado' => $estado,
        'empresa' => $empresa,
        'consentimiento_sensibles' => $consentimiento,
    ],
];

/*
| Usuarios de relleno: mezcla de roles y estados con nombres y correos distintos. Los reclutadores
| quedan ligados a las empresas 1 a 3 y no tienen vacantes ni postulaciones, así que su rol se puede cambiar.
*/
$nombresDePila = ['Alejandro', 'Beatriz', 'Cristian', 'Diana', 'Emilio', 'Fernanda', 'Gerardo', 'Hilda', 'Ismael', 'Jimena', 'Kevin', 'Lourdes',
    'Mauricio', 'Nadia', 'Octavio', 'Paola', 'Rafael', 'Silvia', 'Tomás', 'Ulises', 'Valeria', 'Ximena', 'Yolanda'];
$primerApellido = ['García', 'Hernández', 'Martínez', 'Rodríguez', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Flores', 'Gómez', 'Díaz', 'Reyes', 'Morales',
    'Jiménez', 'Ruiz', 'Álvarez', 'Castillo'];
$segundoApellido = ['Aguilar', 'Bautista', 'Cabrera', 'Delgado', 'Estrada', 'Figueroa', 'Guzmán', 'Herrera', 'Ibarra', 'Juárez', 'Lara', 'Montes', 'Navarro'];
$puestos = ['Reclutadora', 'Analista de Recursos Humanos', 'Gerente de Talento', 'Especialista en Selección', 'Coordinador de Reclutamiento'];
$empresasRelleno = [
    1 => ['id' => 1, 'nombre_comercial' => 'TecnoQro', 'estado' => 'validada'],
    2 => ['id' => 2, 'nombre_comercial' => 'LogiBajío', 'estado' => 'validada'],
    3 => ['id' => 3, 'nombre_comercial' => 'ConCentro', 'estado' => 'validada'],
];
$relleno = [];
for ($n = 0; $n < 46; $n++) {
    $nombre = $nombresDePila[$n % count($nombresDePila)];
    $apellido = $primerApellido[$n % count($primerApellido)];
    $apellidos = $apellido.' '.$segundoApellido[($n * 3 + 1) % count($segundoApellido)];
    $rol = match (true) {
        $n % 20 === 19 => 'administrador',
        in_array($n % 10, [6, 7, 8], true) => 'reclutador',
        default => 'candidato',
    };
    $estado = match (true) {
        $n % 11 === 5 => 'suspendido',
        $n % 17 === 8 => 'eliminado',
        default => 'activo',
    };
    $motivo = match ($estado) {
        'suspendido' => 'Se detectaron datos inconsistentes en su cuenta.',
        'eliminado' => 'Baja solicitada por la persona usuaria.',
        default => null,
    };
    $correo = Str::slug($nombre.' '.$apellido, '.').sprintf('%02d', $n).'@correo.mx';
    $relleno[] = $usuario(107 + $n, $correo, $nombre, $apellidos, '44'.sprintf('%08d', 31000000 + $n * 137), $rol, $estado,
        $rol === 'reclutador' ? $empresasRelleno[1 + $n % 3] : null, $rol === 'candidato' ? false : null,
        $ficha(max(1, 32 - $n), $estado === 'activo' && $n % 4 !== 0 ? $n % 12 : null, $motivo, $rol === 'reclutador' ? $puestos[$n % count($puestos)] : null));
}

return [

    'usuarios' => [
        $usuario(1, 'admin@inclutec.mx', 'Admin', 'IncluTec', null, 'administrador', 'activo', null, null, $ficha(60, 0)),
        $usuario(2, 'rh@tecnoqro.mx', 'Laura', 'Hernández Ruiz', '4421234567', 'reclutador', 'activo',
            ['id' => 1, 'nombre_comercial' => 'TecnoQro', 'estado' => 'validada'], null, $ficha(54, 1, null, 'Coordinadora de Recursos Humanos')),
        $usuario(3, 'mariana.lopez@correo.mx', 'Mariana', 'López García', '4427654321', 'candidato', 'activo', null, true, $ficha(50, 2)),
        $usuario(4, 'jorge.ramirez@correo.mx', 'Jorge', 'Ramírez Soto', '4421112233', 'candidato', 'activo', null, false, $ficha(49, 3)),
        $usuario(5, 'rh@logibajio.mx', 'Roberto', 'Sánchez Mejía', '4422345678', 'reclutador', 'activo',
            ['id' => 2, 'nombre_comercial' => 'LogiBajío', 'estado' => 'validada'], null, $ficha(47, 5, null, 'Jefe de Recursos Humanos')),
        $usuario(6, 'talento@concentro.mx', 'Patricia', 'Núñez Ortega', '4423456789', 'reclutador', 'activo',
            ['id' => 3, 'nombre_comercial' => 'ConCentro', 'estado' => 'validada'], null, $ficha(45, 6, null, 'Coordinadora de Talento')),
        $usuario(7, 'contacto@estudiotrazo.mx', 'Daniel', 'Ortiz Vega', '4424567890', 'reclutador', 'activo',
            ['id' => 4, 'nombre_comercial' => 'Estudio Trazo', 'estado' => 'pendiente'], null, $ficha(44, 7, null, 'Director creativo')),

        // Solo en el mock: prueba el error 423.
        $usuario(100, 'suspendida@correo.mx', 'Sofía', 'Cuenta Suspendida', '4425550000', 'candidato', 'suspendido', null, false, $ficha(70, 30, 'Publicó información falsa en su perfil.')),

        // Solo en el mock: candidatos que dan volumen a las estadísticas. Con necesidades de ajuste
        // registradas tienen el consentimiento expreso; las demás no (candidato.consentimiento_sensibles_en).
        $usuario(101, 'ana.torres@correo.mx', 'Ana', 'Torres Beltrán', '4426660101', 'candidato', 'activo', null, true, $ficha(38, 4)),
        $usuario(102, 'luis.fernandez@correo.mx', 'Luis', 'Fernández Ríos', '4426660102', 'candidato', 'activo', null, true, $ficha(37, 3)),
        $usuario(103, 'carmen.vazquez@correo.mx', 'Carmen', 'Vázquez Luna', '4426660103', 'candidato', 'activo', null, true, $ficha(36, 8)),
        $usuario(104, 'miguel.cruz@correo.mx', 'Miguel Ángel', 'Cruz Pérez', '4426660104', 'candidato', 'activo', null, true, $ficha(35, 2)),
        $usuario(105, 'daniela.morales@correo.mx', 'Daniela', 'Morales Ibarra', '4426660105', 'candidato', 'activo', null, false, $ficha(34, 9)),
        $usuario(106, 'hector.salinas@correo.mx', 'Héctor', 'Salinas Duarte', '4426660106', 'candidato', 'activo', null, true, $ficha(33, 1)),

        // Solo en el mock: usuarios de relleno (ids 107 a 152) para paginar, buscar y filtrar.
        ...$relleno,
    ],

    // Catálogos de db/semillas/S001__catalogos.sql, con los ids de la semilla.
    'catalogos' => [
        'modalidades' => [1 => 'Presencial', 2 => 'Remoto', 3 => 'Híbrido'],
        'categorias' => [
            1 => 'Tecnologías de la información', 2 => 'Administración', 3 => 'Atención a clientes',
            4 => 'Diseño y comunicación', 5 => 'Producción y logística',
        ],
        'habilidades' => [
            1 => 'Python', 2 => 'JavaScript', 3 => 'SQL', 4 => 'Soporte técnico', 5 => 'Redes',
            6 => 'Excel', 7 => 'Contabilidad', 8 => 'Facturación electrónica',
            9 => 'Atención telefónica', 10 => 'Manejo de CRM', 11 => 'Comunicación escrita',
            12 => 'Diseño gráfico', 13 => 'Redacción', 14 => 'Control de inventarios', 15 => 'Manejo de ERP',
        ],
        'ajustes' => [
            1 => 'Acceso con rampa', 2 => 'Elevador', 3 => 'Baño accesible',
            4 => 'Software compatible con lector de pantalla', 5 => 'Documentos en formato accesible',
            6 => 'Intérprete de Lengua de Señas Mexicana', 7 => 'Comunicación por escrito', 8 => 'Alertas visuales',
            9 => 'Subtitulado en reuniones', 10 => 'Instrucciones por escrito y paso a paso',
            11 => 'Espacio de trabajo tranquilo', 12 => 'Horario flexible', 13 => 'Trabajo remoto',
        ],
    ],

    // Campos de EmpresaAdmin (sin los conteos, que calcula ApiMock); `creado_en` ordena el listado.
    'empresas' => [
        ['id' => 1, 'razon_social' => 'Tecnologías Querétaro S.A. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB1',
            'sector' => ['id' => 4, 'nombre' => 'Tecnologías de la información'], 'estado' => 'validada', 'documento' => true, 'creado_en' => $hace(55)],
        ['id' => 2, 'razon_social' => 'Logística Bajío Norte S.A. de C.V.', 'nombre_comercial' => 'LogiBajío', 'rfc' => 'LBN180725KQ3',
            'sector' => ['id' => 1, 'nombre' => 'Manufactura'], 'estado' => 'validada', 'documento' => true, 'creado_en' => $hace(48)],
        ['id' => 3, 'razon_social' => 'Contadores Asociados del Centro S.C.', 'nombre_comercial' => 'ConCentro', 'rfc' => 'CAC0904158T2',
            'sector' => ['id' => 3, 'nombre' => 'Servicios profesionales'], 'estado' => 'validada', 'documento' => true, 'creado_en' => $hace(46)],
        ['id' => 4, 'razon_social' => 'Estudio Trazo Diseño S.A.S.', 'nombre_comercial' => 'Estudio Trazo', 'rfc' => 'ETR2101119P4',
            'sector' => ['id' => 3, 'nombre' => 'Servicios profesionales'], 'estado' => 'pendiente', 'documento' => true, 'creado_en' => $hace(6)],
    ],

    // Lo que el candidato registró (por usuario_id): necesidades de ajuste y habilidades (ids de catálogo).
    'candidatos' => [
        3 => ['necesidades' => [1, 3], 'habilidades' => [4, 5, 6, 11]],
        4 => ['necesidades' => [], 'habilidades' => [1, 3, 6]],
        101 => ['necesidades' => [1, 2], 'habilidades' => [3, 1, 6]],
        102 => ['necesidades' => [6, 9], 'habilidades' => [12, 2]],
        103 => ['necesidades' => [4, 5], 'habilidades' => [7, 6, 8]],
        104 => ['necesidades' => [11, 12], 'habilidades' => [9, 10, 11]],
        105 => ['necesidades' => [], 'habilidades' => [12, 13]],
        106 => ['necesidades' => [1, 13], 'habilidades' => [14, 15, 6]],
    ],

    // `ajustes` lleva el tipo de vacante_ajuste: existente o bajo_solicitud.
    'vacantes' => [
        ['id' => 1, 'reclutador_id' => 2, 'empresa_id' => 1, 'titulo' => 'Técnico de soporte de TI', 'categoria_id' => 1, 'modalidad_id' => 3, 'estado' => 'publicada', 'publicada_en' => $hace(0),
            'habilidades' => [4, 5, 3, 11, 2, 6], 'ajustes' => [[1, 'existente'], [3, 'existente'], [12, 'bajo_solicitud']]],
        ['id' => 2, 'reclutador_id' => 5, 'empresa_id' => 2, 'titulo' => 'Auxiliar de almacén', 'categoria_id' => 5, 'modalidad_id' => 1, 'estado' => 'publicada', 'publicada_en' => $hace(2),
            'habilidades' => [14, 15, 6], 'ajustes' => [[1, 'existente'], [2, 'existente'], [3, 'existente'], [8, 'existente'], [6, 'bajo_solicitud']]],
        ['id' => 3, 'reclutador_id' => 5, 'empresa_id' => 2, 'titulo' => 'Analista de datos de operaciones', 'categoria_id' => 1, 'modalidad_id' => 3, 'estado' => 'publicada', 'publicada_en' => $hace(5),
            'habilidades' => [3, 1, 6, 14], 'ajustes' => [[4, 'existente'], [5, 'existente'], [12, 'bajo_solicitud']]],
        ['id' => 4, 'reclutador_id' => 6, 'empresa_id' => 3, 'titulo' => 'Auxiliar contable', 'categoria_id' => 2, 'modalidad_id' => 2, 'estado' => 'publicada', 'publicada_en' => $hace(1),
            'habilidades' => [7, 8, 6], 'ajustes' => [[13, 'existente'], [7, 'existente'], [10, 'existente']]],
        ['id' => 5, 'reclutador_id' => 6, 'empresa_id' => 3, 'titulo' => 'Ejecutivo de atención telefónica', 'categoria_id' => 3, 'modalidad_id' => 1, 'estado' => 'publicada', 'publicada_en' => $hace(8),
            'habilidades' => [9, 10, 11], 'ajustes' => []],
        ['id' => 6, 'reclutador_id' => 2, 'empresa_id' => 1, 'titulo' => 'Desarrollador web junior', 'categoria_id' => 1, 'modalidad_id' => 2, 'estado' => 'publicada', 'publicada_en' => $hace(3),
            'habilidades' => [2, 3, 1], 'ajustes' => [[4, 'existente'], [9, 'existente'], [12, 'existente'], [6, 'bajo_solicitud']]],
        ['id' => 7, 'reclutador_id' => 2, 'empresa_id' => 1, 'titulo' => 'Diseñador gráfico', 'categoria_id' => 4, 'modalidad_id' => 3, 'estado' => 'borrador', 'publicada_en' => null,
            'habilidades' => [12, 13], 'ajustes' => []],
        ['id' => 8, 'reclutador_id' => 7, 'empresa_id' => 4, 'titulo' => 'Ilustrador digital', 'categoria_id' => 4, 'modalidad_id' => 2, 'estado' => 'borrador', 'publicada_en' => null,
            'habilidades' => [12], 'ajustes' => []],

        // Solo en el mock.
        ['id' => 101, 'reclutador_id' => 2, 'empresa_id' => 1, 'titulo' => 'Community manager', 'categoria_id' => 4, 'modalidad_id' => 2, 'estado' => 'publicada', 'publicada_en' => $hace(12),
            'habilidades' => [12, 13, 11], 'ajustes' => [[13, 'existente'], [7, 'existente'], [12, 'bajo_solicitud']]],
        ['id' => 102, 'reclutador_id' => 6, 'empresa_id' => 3, 'titulo' => 'Asesor de atención presencial', 'categoria_id' => 3, 'modalidad_id' => 1, 'estado' => 'publicada', 'publicada_en' => $hace(20),
            'habilidades' => [9, 10], 'ajustes' => [[1, 'existente'], [3, 'existente'], [11, 'bajo_solicitud']]],
    ],

    // `historial` imita historial_postulacion: cada cambio de estado con su fecha. Las contrataciones
    // del periodo son las postulaciones cuyo historial pasa a «aceptada» dentro de él.
    'postulaciones' => [
        ['id' => 1, 'candidato_id' => 3, 'vacante_id' => 1, 'estado' => 'entrevista', 'creado_en' => $hace(4),
            'historial' => [['postulada', $hace(4)], ['en_revision', $hace(3)], ['entrevista', $hace(2)]]],
        ['id' => 2, 'candidato_id' => 4, 'vacante_id' => 3, 'estado' => 'postulada', 'creado_en' => $hace(2),
            'historial' => [['postulada', $hace(2)]]],

        // Solo en el mock: reparten la actividad en los últimos 90 días y en distintos estados.
        ['id' => 101, 'candidato_id' => 101, 'vacante_id' => 2, 'estado' => 'en_revision', 'creado_en' => $hace(5),
            'historial' => [['postulada', $hace(5)], ['en_revision', $hace(4)]]],
        ['id' => 102, 'candidato_id' => 102, 'vacante_id' => 4, 'estado' => 'aceptada', 'creado_en' => $hace(12),
            'historial' => [['postulada', $hace(12)], ['en_revision', $hace(10)], ['entrevista', $hace(7)], ['aceptada', $hace(3)]]],
        ['id' => 103, 'candidato_id' => 103, 'vacante_id' => 1, 'estado' => 'no_seleccionada', 'creado_en' => $hace(20),
            'historial' => [['postulada', $hace(20)], ['en_revision', $hace(17)], ['no_seleccionada', $hace(14)]]],
        ['id' => 104, 'candidato_id' => 104, 'vacante_id' => 5, 'estado' => 'entrevista', 'creado_en' => $hace(28),
            'historial' => [['postulada', $hace(28)], ['en_revision', $hace(25)], ['entrevista', $hace(21)]]],
        ['id' => 105, 'candidato_id' => 105, 'vacante_id' => 6, 'estado' => 'aceptada', 'creado_en' => $hace(35),
            'historial' => [['postulada', $hace(35)], ['en_revision', $hace(33)], ['entrevista', $hace(30)], ['aceptada', $hace(25)]]],
        ['id' => 106, 'candidato_id' => 106, 'vacante_id' => 3, 'estado' => 'aceptada', 'creado_en' => $hace(45),
            'historial' => [['postulada', $hace(45)], ['en_revision', $hace(43)], ['entrevista', $hace(41)], ['aceptada', $hace(38)]]],
        ['id' => 107, 'candidato_id' => 101, 'vacante_id' => 6, 'estado' => 'retirada', 'creado_en' => $hace(50),
            'historial' => [['postulada', $hace(50)], ['retirada', $hace(48)]]],
        ['id' => 108, 'candidato_id' => 102, 'vacante_id' => 2, 'estado' => 'no_seleccionada', 'creado_en' => $hace(62),
            'historial' => [['postulada', $hace(62)], ['en_revision', $hace(60)], ['no_seleccionada', $hace(55)]]],
        ['id' => 109, 'candidato_id' => 104, 'vacante_id' => 2, 'estado' => 'aceptada', 'creado_en' => $hace(75),
            'historial' => [['postulada', $hace(75)], ['en_revision', $hace(73)], ['entrevista', $hace(70)], ['aceptada', $hace(66)]]],
        ['id' => 110, 'candidato_id' => 105, 'vacante_id' => 1, 'estado' => 'no_seleccionada', 'creado_en' => $hace(85),
            'historial' => [['postulada', $hace(85)], ['en_revision', $hace(83)], ['no_seleccionada', $hace(80)]]],
        ['id' => 111, 'candidato_id' => 3, 'vacante_id' => 6, 'estado' => 'en_revision', 'creado_en' => $hace(18),
            'historial' => [['postulada', $hace(18)], ['en_revision', $hace(15)]]],
        ['id' => 112, 'candidato_id' => 4, 'vacante_id' => 1, 'estado' => 'postulada', 'creado_en' => $hace(9),
            'historial' => [['postulada', $hace(9)]]],
    ],

    'reportes' => [
        ['id' => 1, 'reportante_id' => 4, 'vacante_id' => 5, 'candidato_id' => null, 'estado' => 'abierto', 'creado_en' => $hace(3)],
        ['id' => 101, 'reportante_id' => 3, 'vacante_id' => 2, 'candidato_id' => null, 'estado' => 'en_revision', 'creado_en' => $hace(10)],
    ],

];

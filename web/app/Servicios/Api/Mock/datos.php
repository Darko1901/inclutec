<?php

/*
| Datos de prueba de ApiMock: son los de db/semillas/S002__datos_prueba.sql, con la forma de los
| objetos del contrato (docs/api/contrato.md, sección 5). Son el único lugar donde viven; las
| vistas nunca los importan, siempre pasan por ApiAdmin.
|
| Las cuentas con id 100 en adelante existen solo en el mock (no están en la base de datos de
| prueba); sus ids no chocan con los de S002, que van del 1 al 7.
|
| Lo que falta (empresas, vacantes, reportes y estadísticas) se agrega aquí en las siguientes
| tareas, cada grupo bajo su propia llave.
*/

$contrasena = 'Inclutec2026';

$usuario = fn (int $id, string $correo, string $nombre, string $apellidos, ?string $telefono, string $rol, string $estado = 'activo', ?array $empresa = null, ?bool $consentimiento = null): array => [
    'contrasena' => $contrasena,
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

return [

    'usuarios' => [
        $usuario(1, 'admin@inclutec.mx', 'Admin', 'IncluTec', null, 'administrador'),
        $usuario(2, 'rh@tecnoqro.mx', 'Laura', 'Hernández Ruiz', '4421234567', 'reclutador', 'activo',
            ['id' => 1, 'nombre_comercial' => 'TecnoQro', 'estado' => 'validada']),
        $usuario(3, 'mariana.lopez@correo.mx', 'Mariana', 'López García', '4427654321', 'candidato', 'activo', null, true),
        $usuario(4, 'jorge.ramirez@correo.mx', 'Jorge', 'Ramírez Soto', '4421112233', 'candidato', 'activo', null, false),
        $usuario(5, 'rh@logibajio.mx', 'Roberto', 'Sánchez Mejía', '4422345678', 'reclutador', 'activo',
            ['id' => 2, 'nombre_comercial' => 'LogiBajío', 'estado' => 'validada']),
        $usuario(6, 'talento@concentro.mx', 'Patricia', 'Núñez Ortega', '4423456789', 'reclutador', 'activo',
            ['id' => 3, 'nombre_comercial' => 'ConCentro', 'estado' => 'validada']),
        $usuario(7, 'contacto@estudiotrazo.mx', 'Daniel', 'Ortiz Vega', '4424567890', 'reclutador', 'activo',
            ['id' => 4, 'nombre_comercial' => 'Estudio Trazo', 'estado' => 'pendiente']),

        // Solo en el mock: prueba el error 423.
        $usuario(100, 'suspendida@correo.mx', 'Sofía', 'Cuenta Suspendida', '4425550000', 'candidato', 'suspendido', null, false),
    ],

];

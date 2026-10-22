@extends('layouts.admin_layout')
@section('titulo', 'Detalle de usuario')
@section('content')
@php
    use App\Support\Fechas;
    use App\Support\Iconos;
    use App\Support\Roles;

    $usuario = $detalle['usuario'];
    $totales = $detalle['totales'];
    $nombre = trim($usuario['nombre'].' '.$usuario['apellidos']);
    $sinDato = '<span class="texto-suave">No registrado</span>';
@endphp

<nav class="breadcrumb" aria-label="Ruta de navegación">
    <a href="{{ route('usuarios') }}">Usuarios</a>
    {!! Iconos::svg('flecha-derecha', 14) !!}
    <span aria-current="page">{{ $nombre }}</span>
</nav>

<x-encabezado-pagina :titulo="$nombre" :descripcion="Roles::texto($usuario['rol'])">
    <x-boton variante="secundario" :href="route('usuarios.editar', $usuario['id'])">Editar</x-boton>
    <x-usuario-botones :usuario="$usuario" />
</x-encabezado-pagina>

<p class="aviso-privacidad" role="note">
    {!! Iconos::svg('candado', 20) !!}
    <span>Por privacidad, las necesidades de ajuste de los candidatos no se muestran en el panel.</span>
</p>

<div class="detalle-columnas">
    <section class="card" aria-labelledby="datos-generales">
        <h2 id="datos-generales" class="detalle-titulo">Datos generales</h2>
        <dl class="detalle-lista">
            <div><dt>Correo</dt><dd>{{ $usuario['correo'] }}</dd></div>
            <div><dt>Teléfono</dt><dd>{!! $usuario['telefono'] ? e($usuario['telefono']) : $sinDato !!}</dd></div>
            <div><dt>Rol</dt><dd>{{ Roles::texto($usuario['rol']) }}</dd></div>
            @if ($usuario['rol'] === 'reclutador')
                <div><dt>Empresa</dt><dd>{!! $usuario['empresa'] ? e($usuario['empresa']['nombre_comercial']) : $sinDato !!}</dd></div>
                <div><dt>Puesto</dt><dd>{!! $detalle['puesto'] ? e($detalle['puesto']) : $sinDato !!}</dd></div>
            @endif
            <div><dt>Estado</dt><dd><x-insignia-estado entidad="usuario" :valor="$usuario['estado']" /></dd></div>
            @if ($detalle['motivo_estado'])
                <div><dt>Motivo del estado</dt><dd>{{ $detalle['motivo_estado'] }}</dd></div>
            @endif
            <div><dt>Fecha de registro</dt><dd>{{ Fechas::diaYHora($usuario['creado_en']) }}</dd></div>
            <div><dt>Último acceso</dt><dd>{!! $usuario['ultimo_acceso_en'] ? e(Fechas::diaYHora($usuario['ultimo_acceso_en'])) : '<span class="texto-suave">Nunca ha iniciado sesión</span>' !!}</dd></div>
        </dl>
    </section>

    <section class="card" aria-labelledby="actividad">
        <h2 id="actividad" class="detalle-titulo">Actividad</h2>
        <dl class="detalle-lista">
            @if ($totales['postulaciones'] !== null)
                <div><dt>Postulaciones</dt><dd class="detalle-cifra">{{ number_format($totales['postulaciones']) }}</dd></div>
            @endif
            @if ($totales['vacantes'] !== null)
                <div><dt>Vacantes</dt><dd class="detalle-cifra">{{ number_format($totales['vacantes']) }}</dd></div>
            @endif
            <div><dt>Reportes recibidos</dt><dd class="detalle-cifra">{{ number_format($totales['reportes_recibidos']) }}</dd></div>
            <div><dt>Reportes hechos</dt><dd class="detalle-cifra">{{ number_format($totales['reportes_hechos']) }}</dd></div>
        </dl>
    </section>
</div>

<x-usuario-confirmaciones :usuario="$usuario" />
@endsection

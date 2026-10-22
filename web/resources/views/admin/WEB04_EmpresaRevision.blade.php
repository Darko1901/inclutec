@extends('layouts.admin_layout')
@section('titulo', 'Revisión de empresa')
@section('content')
@php
    use App\Support\Empresas;
    use App\Support\Fechas;
    use App\Support\Iconos;

    $empresa = $detalle['empresa'];
    $sinDato = '<span class="texto-suave">No registrado</span>';
    $hayProblemaRfc = ! $rfcValido || $detalle['rfc_duplicado'];
    $verificaciones = [
        [$rfcValido, 'RFC con formato válido', 'El RFC no tiene formato válido'],
        [! $detalle['rfc_duplicado'], 'RFC no duplicado', 'Otra empresa ya registró este RFC'],
    ];
@endphp

<nav class="breadcrumb" aria-label="Ruta de navegación">
    <a href="{{ route('empresas', ['estado' => $empresa['estado']]) }}">Empresas</a>
    {!! Iconos::svg('flecha-derecha', 14) !!}
    <span aria-current="page">{{ $empresa['nombre_comercial'] }}</span>
</nav>

<x-encabezado-pagina :titulo="$empresa['nombre_comercial']" :descripcion="$empresa['razon_social']">
    <x-boton variante="secundario" :href="route('empresas.editar', $empresa['id'])">Editar</x-boton>
    <x-empresa-botones :empresa="$empresa" />
</x-encabezado-pagina>

<div class="detalle-columnas">
    <section class="card" aria-labelledby="verificacion-rfc">
        <h2 id="verificacion-rfc" class="detalle-titulo">Verificación del RFC</h2>
        <p class="rfc-valor">{{ $empresa['rfc'] }}</p>
        <ul class="verificaciones">
            @foreach ($verificaciones as [$bien, $textoBien, $textoMal])
                <li class="{{ $bien ? 'verificacion-ok' : 'verificacion-mal' }}" data-verificacion="{{ $bien ? 'ok' : 'mal' }}">
                    {!! Iconos::svg($bien ? 'check-circulo' : 'x-circulo', 20) !!}
                    <span>{{ $bien ? $textoBien : $textoMal }}</span>
                </li>
            @endforeach
        </ul>
        @if ($hayProblemaRfc && $empresa['estado'] === 'pendiente')
            <p class="verificacion-aviso">{!! Iconos::svg('alerta', 18) !!} <span>Hay un problema con el RFC: considera rechazar la solicitud y explicar el motivo.</span></p>
        @endif
        <h3 class="detalle-subtitulo">Constancia de situación fiscal</h3>
        @if ($empresa['documento_url'])
            <a class="enlace-constancia" href="{{ route('empresas.constancia', $empresa['id']) }}" target="_blank" rel="noopener">
                {!! Iconos::svg('descarga', 18) !!}
                <span>Ver constancia de situación fiscal (PDF)<span class="visually-hidden"> (se abre en una pestaña nueva)</span></span>
            </a>
        @else
            <p class="texto-suave">Todavía no ha subido su constancia de situación fiscal.</p>
        @endif
    </section>

    <section class="card" aria-labelledby="datos-empresa">
        <h2 id="datos-empresa" class="detalle-titulo">Datos de la empresa</h2>
        <dl class="detalle-lista">
            <div><dt>Estado</dt><dd><x-insignia-estado entidad="empresa" :valor="$empresa['estado']" /></dd></div>
            @if ($empresa['motivo_estado'])
                <div><dt>Motivo</dt><dd>{{ $empresa['motivo_estado'] }}</dd></div>
            @endif
            <div><dt>Razón social</dt><dd>{{ $empresa['razon_social'] }}</dd></div>
            <div><dt>Sector</dt><dd>{{ $empresa['sector']['nombre'] }}</dd></div>
            <div><dt>Tamaño</dt><dd>{{ $empresa['tamano_empresa']['nombre'] }} ({{ $empresa['tamano_empresa']['rango'] }})</dd></div>
            <div><dt>Municipio</dt><dd>{{ $empresa['municipio']['nombre'] }}, {{ $empresa['municipio']['entidad']['nombre'] }}</dd></div>
            <div><dt>Dirección</dt><dd>{!! $empresa['direccion'] ? e($empresa['direccion']) : $sinDato !!}</dd></div>
            <div><dt>Sitio web</dt><dd>{!! $empresa['sitio_web'] ? e($empresa['sitio_web']) : $sinDato !!}</dd></div>
            <div><dt>Descripción</dt><dd>{!! $empresa['descripcion'] ? e($empresa['descripcion']) : $sinDato !!}</dd></div>
            <div><dt>Prácticas de inclusión</dt><dd>{!! $empresa['practicas_inclusion'] ? e($empresa['practicas_inclusion']) : $sinDato !!}</dd></div>
            <div><dt>Validada el</dt><dd>{!! $empresa['validada_en'] ? e(Fechas::diaYHora($empresa['validada_en'])) : '<span class="texto-suave">Aún no</span>' !!}</dd></div>
            <div><dt>Reportes recibidos</dt><dd class="detalle-cifra">{{ number_format($detalle['reportes']) }}</dd></div>
        </dl>
    </section>
</div>

<section class="seccion-reclutadores" aria-labelledby="reclutadores">
    <h2 id="reclutadores" class="detalle-titulo">Reclutadores</h2>
    <x-tabla caption="Reclutadores de la empresa" :columnas="['Nombre', 'Correo', 'Puesto', 'Estado']" mensajeVacio="Esta empresa todavía no tiene reclutadores.">
        @foreach ($detalle['reclutadores'] as $reclutador)
            <tr>
                <td class="celda-nombre"><a href="{{ route('usuarios.ver', $reclutador['usuario_id']) }}">{{ $reclutador['nombre'] }} {{ $reclutador['apellidos'] }}</a></td>
                <td>{{ $reclutador['correo'] }}</td>
                <td>{{ $reclutador['puesto'] }}</td>
                <td><x-insignia-estado entidad="usuario" :valor="$reclutador['estado']" /></td>
            </tr>
        @endforeach
    </x-tabla>
</section>

<x-empresa-confirmaciones :empresa="$empresa" />
@endsection

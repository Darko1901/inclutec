@extends('layouts.admin_layout')
@section('titulo', 'Detalle de reporte')
@section('content')
@php
    use App\Support\Fechas;
    use App\Support\Iconos;
    use App\Support\Reportes;

    $reporte = $detalle['reporte'];
    $abierto = in_array($reporte['estado'], ['abierto', 'en_revision'], true);
    $previos = $detalle['reportes_previos'];
@endphp

<nav class="breadcrumb" aria-label="Ruta de navegación">
    <a href="{{ route('reportes', ['estado' => $reporte['estado']]) }}">Reportes</a>
    {!! Iconos::svg('flecha-derecha', 14) !!}
    <span aria-current="page">Reporte #{{ $reporte['id'] }}</span>
</nav>

<x-encabezado-pagina :titulo="'Reporte #'.$reporte['id']" :descripcion="Reportes::TIPOS[$reporte['tipo']].' · '.$reporte['motivo']['nombre']">
    <x-reporte-botones :reporte="$reporte" :elemento="$elemento" />
</x-encabezado-pagina>

<div class="detalle-columnas">
    <section class="card" aria-labelledby="datos-reporte">
        <h2 id="datos-reporte" class="detalle-titulo">Datos del reporte</h2>
        <dl class="detalle-lista">
            <div><dt>Folio</dt><dd>#{{ $reporte['id'] }}</dd></div>
            <div><dt>Estado</dt><dd><x-insignia-estado entidad="reporte" :valor="$reporte['estado']" /></dd></div>
            <div><dt>Tipo</dt><dd>{{ Reportes::TIPOS[$reporte['tipo']] }}</dd></div>
            <div><dt>Motivo</dt><dd>{{ $reporte['motivo']['nombre'] }}</dd></div>
            <div><dt>Quién reporta</dt><dd><a href="{{ route('usuarios.ver', $reporte['reportante']['id']) }}">{{ $reporte['reportante']['nombre'] }} {{ $reporte['reportante']['apellidos'] }}</a></dd></div>
            <div><dt>Fecha</dt><dd>{{ Fechas::diaYHora($reporte['creado_en']) }}</dd></div>
            <div><dt>Descripción</dt><dd>{!! $detalle['descripcion'] ? e($detalle['descripcion']) : '<span class="texto-suave">Sin descripción</span>' !!}</dd></div>
            @if ($detalle['resolucion'])
                <div><dt>Resolución</dt><dd>{{ $detalle['resolucion'] }}</dd></div>
            @endif
            @if ($detalle['accion'])
                <div><dt>Acción tomada</dt><dd>{{ Reportes::ACCIONES_TOMADAS[$detalle['accion']] }}</dd></div>
            @endif
            @if ($detalle['atendido_por'])
                <div><dt>Atendido por</dt><dd>{{ $detalle['atendido_por']['nombre'] }} {{ $detalle['atendido_por']['apellidos'] }}</dd></div>
            @endif
            @if ($detalle['cerrado_en'])
                <div><dt>Cerrado el</dt><dd>{{ Fechas::diaYHora($detalle['cerrado_en']) }}</dd></div>
            @endif
        </dl>
    </section>

    <section class="card" aria-labelledby="elemento-reportado">
        <h2 id="elemento-reportado" class="detalle-titulo">Elemento reportado</h2>
        <dl class="detalle-lista">
            <div><dt>{{ Reportes::TIPOS[$reporte['tipo']] }}</dt><dd><a href="{{ route($elemento['ruta'], $reporte['objeto']['id']) }}">{{ $reporte['objeto']['nombre'] }}<span class="visually-hidden"> ({{ $elemento['ver'] }})</span></a></dd></div>
            <div><dt>Estado actual</dt><dd><x-insignia-estado :entidad="$elemento['entidad']" :valor="$detalle['objeto_estado']" /></dd></div>
        </dl>
        <div class="elemento-acciones">
            <x-boton variante="secundario" :href="route($elemento['ruta'], $reporte['objeto']['id'])">{{ $elemento['ver'] }}</x-boton>
            @if ($elemento['suspendible'] && $abierto)
                <x-boton variante="peligro" @click="$dispatch('abrir-modal', 'reporte-{{ $reporte['id'] }}-suspender')" aria-haspopup="dialog">{{ $elemento['suspender'] }}</x-boton>
            @endif
        </div>
        @if (! $elemento['suspendible'] && $abierto)
            <p class="texto-suave">Este elemento ya no se puede suspender desde aquí: su estado actual no lo permite.</p>
        @endif
    </section>
</div>

<section class="seccion-reclutadores" aria-labelledby="reportes-previos">
    <h2 id="reportes-previos" class="detalle-titulo">Reportes anteriores contra este elemento: {{ count($previos) }}</h2>
    <x-tabla caption="Reportes anteriores contra este elemento" :columnas="['Folio', 'Motivo', 'Fecha', 'Estado']" mensajeVacio="Este elemento no tiene otros reportes.">
        @foreach ($previos as $previo)
            <tr>
                <td class="celda-nombre"><a href="{{ route('reportes.ver', $previo['id']) }}">#{{ $previo['id'] }}</a></td>
                <td>{{ $previo['motivo'] }}</td>
                <td>{{ Fechas::dia($previo['creado_en']) }}</td>
                <td><x-insignia-estado entidad="reporte" :valor="$previo['estado']" /></td>
            </tr>
        @endforeach
    </x-tabla>
</section>

<section class="seccion-reclutadores" aria-labelledby="historial">
    <h2 id="historial" class="detalle-titulo">Historial de cambios</h2>
    <x-tabla caption="Historial de cambios del reporte" :columnas="['Fecha', 'Cambio', 'Comentario', 'Quién']">
        @foreach ($detalle['historial'] as $cambio)
            <tr>
                <td>{{ Fechas::diaYHora($cambio['creado_en']) }}</td>
                <td class="cambio-estado">
                    @if ($cambio['estado_anterior'])
                        <x-insignia-estado entidad="reporte" :valor="$cambio['estado_anterior']" />
                        <span class="cambio-flecha">{!! Iconos::svg('flecha-derecha', 14) !!}<span class="visually-hidden">pasó a</span></span>
                    @else
                        <span class="texto-suave">Se creó como</span>
                    @endif
                    <x-insignia-estado entidad="reporte" :valor="$cambio['estado_nuevo']" />
                </td>
                <td>{!! $cambio['comentario'] ? e($cambio['comentario']) : '<span class="texto-suave">—</span>' !!}</td>
                <td>{!! $cambio['usuario'] ? e($cambio['usuario']['nombre']) : '<span class="texto-suave">Quien reportó</span>' !!}</td>
            </tr>
        @endforeach
    </x-tabla>
</section>

<x-reporte-confirmaciones :reporte="$reporte" :elemento="$elemento" />
@endsection

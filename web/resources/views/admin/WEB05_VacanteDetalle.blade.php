@extends('layouts.admin_layout')
@section('titulo', 'Detalle de vacante')
@section('content')
@php
    use App\Support\AccionesVacante;
    use App\Support\Fechas;
    use App\Support\Iconos;

    $textos = AccionesVacante::ACCESIBILIDAD;
    $obligatorias = array_values(array_filter($vacante['habilidades'], fn ($h) => $h['obligatoria']));
    $deseables = array_values(array_filter($vacante['habilidades'], fn ($h) => ! $h['obligatoria']));
    $existentes = array_values(array_filter($vacante['ajustes'], fn ($a) => $a['tipo'] === 'existente'));
    $bajoSolicitud = array_values(array_filter($vacante['ajustes'], fn ($a) => $a['tipo'] === 'bajo_solicitud'));
    $salario = AccionesVacante::salario($vacante['salario']);
    $sinDato = '<span class="texto-suave">No registrado</span>';
@endphp

<nav class="breadcrumb" aria-label="Ruta de navegación">
    <a href="{{ route('vacantes') }}">Vacantes</a>
    {!! Iconos::svg('flecha-derecha', 14) !!}
    <span aria-current="page">{{ $vacante['titulo'] }}</span>
</nav>

<x-encabezado-pagina :titulo="$vacante['titulo']" :descripcion="$vacante['empresa']['nombre_comercial']">
    <x-vacante-botones :vacante="$vacante" />
</x-encabezado-pagina>

<div class="detalle-columnas">
    <section class="card" aria-labelledby="datos-generales">
        <h2 id="datos-generales" class="detalle-titulo">Datos generales</h2>
        <dl class="detalle-lista">
            <div><dt>Estado</dt><dd><x-insignia-estado entidad="vacante" :valor="$vacante['estado']" /></dd></div>
            @if ($vacante['motivo_estado'])
                <div><dt>Motivo</dt><dd>{{ $vacante['motivo_estado'] }}</dd></div>
            @endif
            <div><dt>Empresa</dt><dd><a href="{{ route('empresas.ver', $vacante['empresa']['id']) }}">{{ $vacante['empresa']['nombre_comercial'] }}</a></dd></div>
            <div><dt>Categoría</dt><dd>{{ $vacante['categoria']['nombre'] }}</dd></div>
            <div><dt>Publicada el</dt><dd>{!! $vacante['publicada_en'] ? e(Fechas::diaYHora($vacante['publicada_en'])) : '<span class="texto-suave">Aún no se publica</span>' !!}</dd></div>
            <div><dt>Última actualización</dt><dd>{{ Fechas::diaYHora($vacante['actualizado_en']) }}</dd></div>
            <div><dt>Postulados</dt><dd class="detalle-cifra">{{ number_format($vacante['postulados']) }}</dd></div>
            <div><dt>Descripción</dt><dd>{{ $vacante['descripcion'] }}</dd></div>
        </dl>
    </section>

    <section class="card" aria-labelledby="requisitos">
        <h2 id="requisitos" class="detalle-titulo">Requisitos</h2>
        @if ($obligatorias)
            <h3 class="detalle-subtitulo">Habilidades obligatorias</h3>
            <ul class="lista-puntos">@foreach ($obligatorias as $habilidad)<li>{{ $habilidad['nombre'] }}</li>@endforeach</ul>
        @endif
        @if ($deseables)
            <h3 class="detalle-subtitulo">Habilidades deseables</h3>
            <ul class="lista-puntos">@foreach ($deseables as $habilidad)<li>{{ $habilidad['nombre'] }}</li>@endforeach</ul>
        @endif
        <dl class="detalle-lista">
            <div><dt>Formación mínima</dt><dd>{{ $vacante['nivel_educativo']['nombre'] ?? 'No se pide formación mínima' }}</dd></div>
            <div><dt>Experiencia</dt><dd>{{ AccionesVacante::experiencia($vacante['experiencia_anios']) }}</dd></div>
        </dl>
    </section>

    <section class="card" aria-labelledby="condiciones">
        <h2 id="condiciones" class="detalle-titulo">Condiciones</h2>
        <dl class="detalle-lista">
            <div><dt>Jornada</dt><dd>{{ $vacante['jornada']['nombre'] }}</dd></div>
            <div><dt>Contrato</dt><dd>{{ $vacante['tipo_contrato']['nombre'] }}</dd></div>
            <div><dt>Plazas</dt><dd>{{ AccionesVacante::plazas($vacante['plazas']) }}</dd></div>
            <div><dt>Modalidad</dt><dd>{{ $vacante['modalidad']['nombre'] }}</dd></div>
            <div><dt>Municipio</dt><dd>{{ $vacante['municipio']['nombre'] }}, {{ $vacante['municipio']['entidad']['nombre'] }}</dd></div>
            <div><dt>Dirección</dt><dd>{!! $vacante['direccion'] ? e($vacante['direccion']) : $sinDato !!}</dd></div>
            <div>
                <dt>Salario</dt>
                <dd>
                    {!! $salario ? e($salario) : '<span class="texto-suave">No registrado</span>' !!}
                    @if ($salario && ! $vacante['mostrar_salario'])
                        <span class="nota-salario">No se muestra a los candidatos.</span>
                    @endif
                </dd>
            </div>
        </dl>
    </section>

    <section class="card" aria-labelledby="accesibilidad">
        <h2 id="accesibilidad" class="detalle-titulo">Accesibilidad</h2>
        @if ($vacante['sin_condiciones_accesibilidad'])
            <p class="aviso-sin-condiciones">{!! Iconos::svg('info', 20) !!}<span>{{ $textos['sin_condiciones'] }}</span></p>
        @else
            @foreach ([['existente', $existentes, 'check-circulo'], ['bajo_solicitud', $bajoSolicitud, 'info']] as [$tipo, $ajustes, $icono])
                @if ($ajustes)
                    <h3 class="detalle-subtitulo">{{ $textos[$tipo] }}</h3>
                    <ul class="lista-ajustes">
                        @foreach ($ajustes as $ajuste)
                            <li class="ajuste-{{ $tipo }}">{!! Iconos::svg($icono, 18) !!}<span><strong>{{ $ajuste['nombre'] }}</strong><span class="ajuste-descripcion">{{ $ajuste['descripcion'] }}</span></span></li>
                        @endforeach
                    </ul>
                @endif
            @endforeach
            @unless ($existentes || $bajoSolicitud)
                <p class="texto-suave">{{ $textos['sin_declarar'] }}</p>
            @endunless
        @endif
        @if ($vacante['notas_accesibilidad'])
            <h3 class="detalle-subtitulo">{{ $textos['notas'] }}</h3>
            <p>{{ $vacante['notas_accesibilidad'] }}</p>
        @endif
    </section>
</div>

<x-vacante-confirmaciones :vacante="$vacante" />
@endsection

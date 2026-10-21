@extends('layouts.admin_layout')
@section('titulo', 'Dashboard')
@section('content')
@php
    use App\Support\Iconos;
    use App\Support\PeriodoEstadisticas;

    $totalEmpresas = $pendientes['empresas_por_validar'];
    $totalReportes = $pendientes['reportes_abiertos'];
    $parametros = $periodo->parametros();
@endphp

<x-encabezado-pagina titulo="Dashboard" descripcion="Estado de la plataforma. Solo se muestran datos agregados: nadie puede ser identificado.">
    <x-boton variante="secundario" :href="route('dashboard.exportar', ['formato' => 'pdf'] + $parametros)">{!! Iconos::svg('descarga', 18) !!} Exportar PDF</x-boton>
    <x-boton variante="secundario" :href="route('dashboard.exportar', ['formato' => 'xlsx'] + $parametros)">{!! Iconos::svg('descarga', 18) !!} Exportar XLSX</x-boton>
</x-encabezado-pagina>

@if ($errors->any())
    <x-resumen-errores titulo="Revisa el periodo." />
@endif

<x-filtros etiqueta="Periodo" :accion="route('dashboard')">
    <div class="filtros-periodo" x-data="{ periodo: @js($periodo->entrada['periodo'] ?? $periodo->clave) }">
        <x-campo nombre="periodo" etiqueta="Periodo" tipo="select" :opciones="PeriodoEstadisticas::OPCIONES"
                 :valor="$periodo->entrada['periodo'] ?? $periodo->clave" x-model="periodo" />
        <div class="filtros-fechas" x-show="periodo === 'personalizado'" x-cloak>
            <x-campo nombre="desde" etiqueta="Desde" tipo="date" :valor="$periodo->entrada['desde'] ?? $periodo->desde"
                     ayuda="Primer día del periodo." x-bind:disabled="periodo !== 'personalizado'" />
            <x-campo nombre="hasta" etiqueta="Hasta" tipo="date" :valor="$periodo->entrada['hasta'] ?? $periodo->hasta"
                     ayuda="Último día del periodo (máximo 12 meses)." x-bind:disabled="periodo !== 'personalizado'" />
        </div>
    </div>
</x-filtros>

<p class="periodo-vigente" role="status">Mostrando: <strong>{{ $periodo->texto() }}</strong>.</p>

<section class="dashboard-seccion" aria-labelledby="titulo-indicadores">
    <h2 id="titulo-indicadores" class="dashboard-seccion-titulo">Indicadores</h2>
    <div class="dashboard-grid indicadores">
        @foreach ($indicadores as $indicador)
            <article class="stat-card indicador" data-indicador="{{ $indicador['clave'] }}">
                <h3 class="indicador-titulo">{!! Iconos::svg($indicador['icono'], 20) !!} {{ $indicador['titulo'] }}</h3>
                <p class="value indicador-valor">{{ $indicador['valor'] }}</p>
                <p class="indicador-significado">{{ $indicador['significado'] }}</p>
            </article>
        @endforeach
    </div>
</section>

<section class="dashboard-seccion" aria-labelledby="titulo-pendientes">
    <h2 id="titulo-pendientes" class="dashboard-seccion-titulo">Pendientes de atención</h2>
    <div class="pendientes">
        <article class="card pendiente" data-pendiente="empresas_por_validar">
            <div class="pendiente-cuerpo">
                <p class="pendiente-cifra">{{ number_format($totalEmpresas) }}</p>
                <div>
                    <p class="pendiente-texto">{{ $totalEmpresas === 1 ? 'empresa por validar' : 'empresas por validar' }}</p>
                    <x-insignia-estado entidad="empresa" valor="pendiente" />
                </div>
            </div>
            <x-boton variante="secundario" :href="route('empresas', ['estado' => 'pendiente'])">Ver empresas por validar</x-boton>
        </article>
        <article class="card pendiente" data-pendiente="reportes_abiertos">
            <div class="pendiente-cuerpo">
                <p class="pendiente-cifra">{{ number_format($totalReportes) }}</p>
                <div>
                    <p class="pendiente-texto">{{ $totalReportes === 1 ? 'reporte abierto' : 'reportes abiertos' }}</p>
                    <x-insignia-estado entidad="reporte" valor="abierto" />
                </div>
            </div>
            <x-boton variante="secundario" :href="route('reportes', ['estado' => 'abierto'])">Ver reportes abiertos</x-boton>
        </article>
    </div>
</section>

<section class="dashboard-seccion" aria-labelledby="titulo-vinculacion">
    <h2 id="titulo-vinculacion" class="dashboard-seccion-titulo">Vinculación</h2>
    <div class="graficas">
        @foreach ($graficasVinculacion as $grafica)
            <x-grafica :grafica="$grafica" />
        @endforeach
    </div>
</section>

<section class="dashboard-seccion" aria-labelledby="titulo-brecha">
    <h2 id="titulo-brecha" class="dashboard-seccion-titulo">Brecha de accesibilidad</h2>
    <div class="graficas">
        @foreach ($graficasBrecha as $grafica)
            <x-grafica :grafica="$grafica" />
        @endforeach
    </div>
</section>
@endsection

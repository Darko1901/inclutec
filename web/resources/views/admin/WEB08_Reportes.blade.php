@extends('layouts.admin_layout')
@section('titulo', 'Reportes')
@section('content')
@php
    use App\Support\Fechas;
    use App\Support\Reportes;
@endphp

<x-encabezado-pagina titulo="Reportes" descripcion="Reportes de vacantes, empresas y candidatos. Revísalos, da seguimiento y ciérralos con una resolución." />

{{-- Pestañas por estado: enlaces con aria-current en la actual y el número de reportes de cada una. --}}
<nav class="pestanas" aria-label="Estado de los reportes">
    <ul class="pestanas-lista">
        @foreach (Reportes::PESTANAS as $valor => $nombre)
            <li>
                <a href="{{ route('reportes', ['estado' => $valor] + $filtrosPestana) }}" class="pestana"
                   @if ($valor === $estadoActual) aria-current="page" @endif>
                    {{ $nombre }} <span class="pestana-total">({{ number_format($totales[$valor]) }})</span>
                </a>
            </li>
        @endforeach
    </ul>
</nav>

<x-filtros etiqueta="Filtrar reportes" :accion="route('reportes', ['estado' => $estadoActual])" :total="$pagina['total']"
           :selects="[
               ['nombre' => 'tipo', 'etiqueta' => 'Tipo', 'opciones' => Reportes::TIPOS, 'todas' => 'Todos los tipos'],
               ['nombre' => 'motivo_reporte_id', 'etiqueta' => 'Motivo', 'opciones' => $opcionesMotivo, 'todas' => 'Todos los motivos'],
               ['nombre' => 'orden', 'etiqueta' => 'Orden', 'opciones' => Reportes::ORDENES, 'todas' => null],
           ]">
    <input type="hidden" name="estado" value="{{ $estadoActual }}">
</x-filtros>

<x-tabla :caption="'Reportes: '.Reportes::PESTANAS[$estadoActual]" class="tabla-compacta"
         :columnas="['Folio', 'Tipo', 'Elemento reportado', 'Motivo', 'Quién reporta', 'Fecha', 'Estado', 'Acciones']"
         mensajeVacio="No hay reportes con esos filtros en esta pestaña.">
    @foreach ($pagina['items'] as $reporte)
        <tr>
            <td class="celda-nombre">#{{ $reporte['id'] }}</td>
            <td>{{ Reportes::TIPOS[$reporte['tipo']] }}</td>
            <td>{{ $reporte['objeto']['nombre'] }}</td>
            <td>{{ $reporte['motivo']['nombre'] }}</td>
            <td>{{ $reporte['reportante']['nombre'] }} {{ $reporte['reportante']['apellidos'] }}</td>
            <td>{{ Fechas::dia($reporte['creado_en']) }}</td>
            <td><x-insignia-estado entidad="reporte" :valor="$reporte['estado']" /></td>
            <td>
                <div class="acciones-fila">
                    <x-boton variante="texto" :href="route('reportes.ver', $reporte['id'])">{{ in_array($reporte['estado'], ['abierto', 'en_revision'], true) ? 'Revisar' : 'Ver' }}<span class="visually-hidden"> el reporte {{ $reporte['id'] }}</span></x-boton>
                </div>
            </td>
        </tr>
    @endforeach
</x-tabla>

<x-paginacion :total="$pagina['total']" :page="$pagina['page']" :size="$pagina['size']" />
@endsection

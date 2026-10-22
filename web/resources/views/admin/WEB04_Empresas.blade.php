@extends('layouts.admin_layout')
@section('titulo', 'Empresas')
@section('content')
@php
    use App\Support\Empresas;
    use App\Support\Fechas;

    $filtrando = $q !== '';
@endphp

<x-encabezado-pagina titulo="Empresas" descripcion="Revisa las solicitudes de las empresas y gestiona las que ya participan en la plataforma.">
    <x-boton :href="route('empresas.crear')">Nueva empresa</x-boton>
</x-encabezado-pagina>

{{-- Pestañas por estado: enlaces con aria-current en la actual y el número de empresas de cada una. --}}
<nav class="pestanas" aria-label="Estado de las empresas">
    <ul class="pestanas-lista">
        @foreach (Empresas::PESTANAS as $valor => $nombre)
            <li>
                <a href="{{ route('empresas', array_filter(['estado' => $valor, 'q' => $q])) }}" class="pestana"
                   @if ($valor === $estadoActual) aria-current="page" @endif>
                    {{ $nombre }} <span class="pestana-total">({{ number_format($totales[$valor]) }})</span>
                </a>
            </li>
        @endforeach
    </ul>
</nav>

<x-filtros buscar="Buscar por razón social, nombre comercial o RFC" placeholderBusqueda="Razón social, nombre o RFC" etiqueta="Buscar empresas"
           :accion="route('empresas', ['estado' => $estadoActual])" :total="$pagina['total']">
    <input type="hidden" name="estado" value="{{ $estadoActual }}">
</x-filtros>

<x-tabla :caption="'Empresas: '.Empresas::PESTANAS[$estadoActual]" class="tabla-compacta"
         :columnas="['Razón social', 'Nombre comercial', 'RFC', 'Sector', 'Reclutadores', 'Vacantes activas', 'Fecha de solicitud', 'Estado', 'Acciones']"
         :mensajeVacio="$filtrando ? 'No se encontraron empresas con esa búsqueda.' : 'No hay empresas en esta pestaña.'">
    @foreach ($pagina['items'] as $empresa)
        <tr>
            <td class="celda-nombre">{{ $empresa['razon_social'] }}</td>
            <td>{{ $empresa['nombre_comercial'] }}</td>
            <td class="celda-rfc">{{ $empresa['rfc'] }}</td>
            <td>{{ $empresa['sector']['nombre'] }}</td>
            <td>{{ number_format($empresa['reclutadores']) }}</td>
            <td>{{ number_format($empresa['vacantes_activas']) }}</td>
            <td>{{ Fechas::dia($empresa['creado_en']) }}</td>
            <td><x-insignia-estado entidad="empresa" :valor="$empresa['estado']" /></td>
            <td>
                <div class="acciones-fila">
                    <x-boton variante="texto" :href="route('empresas.ver', $empresa['id'])">{{ $empresa['estado'] === 'pendiente' ? 'Revisar' : 'Ver' }}<span class="visually-hidden"> a {{ $empresa['nombre_comercial'] }}</span></x-boton>
                    <x-boton variante="texto" :href="route('empresas.editar', $empresa['id'])">Editar<span class="visually-hidden"> a {{ $empresa['nombre_comercial'] }}</span></x-boton>
                </div>
            </td>
        </tr>
    @endforeach
</x-tabla>

<x-paginacion :total="$pagina['total']" :page="$pagina['page']" :size="$pagina['size']" />
@endsection

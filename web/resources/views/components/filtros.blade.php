@props([
    'buscar' => null,
    'nombreBusqueda' => 'q',
    'placeholderBusqueda' => null,
    'selects' => [],
    'total' => null,
    'accion' => null,
    'etiqueta' => 'Filtros',
])
@php
    $destino = $accion ?? url()->current();
    $anuncio = match (true) {
        $total === null => null,
        (int) $total === 0 => 'No se encontraron resultados.',
        (int) $total === 1 => '1 resultado.',
        default => ((int) $total).' resultados.',
    };
@endphp
{{-- Formulario GET: los filtros viven en la URL. «Aplicar» vuelve a la página 1 y «Limpiar» quita todos los filtros. --}}
<form method="GET" action="{{ $destino }}" role="search" aria-label="{{ $etiqueta }}" {{ $attributes->class(['card', 'filtros']) }}>
    @if ($buscar)
        <x-campo :nombre="$nombreBusqueda" :etiqueta="$buscar" tipo="search" :valor="request($nombreBusqueda)" :placeholder="$placeholderBusqueda" />
    @endif
    @foreach ($selects as $select)
        <x-campo :nombre="$select['nombre']" :etiqueta="$select['etiqueta']" tipo="select" :opciones="$select['opciones']"
                 :vacio="$select['todas'] ?? 'Todos'" :valor="request($select['nombre'])" />
    @endforeach
    {{ $slot }}
    <div class="filtros-acciones">
        <x-boton tipo="submit">Aplicar</x-boton>
        <x-boton variante="secundario" :href="$destino">Limpiar</x-boton>
    </div>
    @if ($anuncio)
        <div class="visually-hidden" role="status" aria-live="polite" x-data="resultados(@js($anuncio))" x-text="anuncio"></div>
    @endif
</form>

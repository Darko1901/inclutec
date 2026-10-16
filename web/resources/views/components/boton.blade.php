@props(['variante' => 'primario', 'tipo' => 'button', 'href' => null, 'deshabilitado' => false])
@php
    $clase = [
        'primario' => 'btn btn-primary',
        'secundario' => 'btn btn-outline',
        'peligro' => 'btn btn-danger',
        'texto' => 'btn-texto',
    ][$variante] ?? throw new \InvalidArgumentException("Variante de botón desconocida: «{$variante}».");
@endphp
@if ($href && ! $deshabilitado)
    <a href="{{ $href }}" {{ $attributes->class([$clase]) }}>{{ $slot }}</a>
@else
    <button type="{{ $tipo }}" {{ $attributes->class([$clase]) }} @disabled($deshabilitado)>{{ $slot }}</button>
@endif

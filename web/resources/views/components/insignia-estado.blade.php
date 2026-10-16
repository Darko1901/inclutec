@props(['entidad', 'valor'])
@php
    use App\Support\Estados;
    use App\Support\Iconos;

    // Un valor que el mapa no conoce se muestra en gris con su texto en crudo en lugar de romper la pantalla.
    $estado = Estados::existe($entidad, (string) $valor)
        ? Estados::de($entidad, (string) $valor)
        : ['texto' => \Illuminate\Support\Str::of((string) $valor)->replace('_', ' ')->ucfirst()->toString(), 'icono' => 'menos-circulo', 'variante' => 'neutro'];

    $clase = [
        'exito' => 'badge-active',
        'advertencia' => 'badge-pending',
        'error' => 'badge-banned',
        'info' => 'badge-info',
        'neutro' => 'badge-neutral',
    ][$estado['variante']];
@endphp
<span {{ $attributes->class(['badge', $clase]) }} data-estado="{{ $valor }}">{!! Iconos::svg($estado['icono'], 14) !!}<span>{{ $estado['texto'] }}</span></span>

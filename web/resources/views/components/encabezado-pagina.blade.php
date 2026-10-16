@props(['titulo', 'descripcion' => null])
<div {{ $attributes->class(['encabezado-pagina']) }}>
    <div>
        <h1>{{ $titulo }}</h1>
        @if ($descripcion)
            <p class="descripcion">{{ $descripcion }}</p>
        @endif
    </div>
    @if ($slot->hasActualContent())
        <div class="encabezado-acciones">{{ $slot }}</div>
    @endif
</div>

@props(['id', 'titulo', 'abierto' => false])
@php use App\Support\Iconos; @endphp
{{-- Se abre con $dispatch('abrir-modal', '{{ $id }}'). El foco queda atrapado dentro, Escape y «Cerrar» lo cierran y el foco regresa a quien lo abrió. --}}
<div x-data="modal(@js($id), @js((bool) $abierto))"
     @abrir-modal.window="if ($event.detail === id) abrir()"
     @cerrar-modal.window="if ($event.detail === id) cerrar()"
     @keydown.escape.window="cerrar()"
     data-modal="{{ $id }}">
    <div class="modal-overlay" x-show="abierto" x-cloak @click.self="cerrar()">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="{{ $id }}-titulo" tabindex="-1" x-trap.noscroll.inert="abierto">
            <div class="modal-encabezado">
                <h2 class="modal-title" id="{{ $id }}-titulo">{{ $titulo }}</h2>
                <button type="button" class="boton-icono modal-cerrar" @click="cerrar()" aria-label="Cerrar">{!! Iconos::svg('x', 22) !!}</button>
            </div>
            <div class="modal-cuerpo">{{ $slot }}</div>
            @isset($pie)
                <div class="modal-actions">{{ $pie }}</div>
            @endisset
        </div>
    </div>
</div>

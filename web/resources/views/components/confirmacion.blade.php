@props([
    'id',
    'titulo',
    'mensaje' => null,
    'textoConfirmar' => 'Confirmar',
    'variante' => 'peligro',
    'pedirMotivo' => false,
    'etiquetaMotivo' => 'Motivo',
    'campoMotivo' => 'motivo',
    'maximoMotivo' => 255,
    'accion' => null,
    'metodo' => 'POST',
    'abierto' => false,
])
{{-- Con `accion` envía un formulario (POST o el método indicado); sin ella avisa con el evento `confirmado` ({ id, motivo }). --}}
<x-modal :id="$id" :titulo="$titulo" :abierto="$abierto">
    <form method="POST" action="{{ $accion }}" novalidate
          x-data="confirmacion({ id: @js($id), pideMotivo: @js((bool) $pedirMotivo), envia: @js($accion !== null), motivo: @js((string) old($campoMotivo, '')), error: @js((string) $errors->first($campoMotivo)) })"
          @submit="enviar($event)">
        @if ($accion)
            @csrf
            @method($metodo)
        @endif

        @if ($mensaje)
            <p class="confirmacion-mensaje">{{ $mensaje }}</p>
        @endif
        {{ $slot }}

        @if ($pedirMotivo)
            <div class="form-group">
                <label class="form-label" for="{{ $id }}-motivo">
                    {{ $etiquetaMotivo }} <span class="form-obligatorio" aria-hidden="true">*</span><span class="visually-hidden">(obligatorio)</span>
                </label>
                <textarea id="{{ $id }}-motivo" name="{{ $campoMotivo }}" class="form-control" rows="3" maxlength="{{ $maximoMotivo }}" autofocus required aria-required="true"
                          x-ref="motivo" x-model="motivo" :aria-invalid="error ? 'true' : 'false'" aria-describedby="{{ $id }}-motivo-error"></textarea>
                <div id="{{ $id }}-motivo-error" class="form-error" x-show="error" x-cloak x-text="error"></div>
            </div>
        @endif

        <div class="modal-actions">
            <x-boton variante="secundario" @click="$dispatch('cerrar-modal', '{{ $id }}')">Cancelar</x-boton>
            <x-boton :variante="$variante" tipo="submit">{{ $textoConfirmar }}</x-boton>
        </div>
    </form>
</x-modal>

@props(['clave', 'filas', 'grupos' => null, 'opciones' => []])
@php
    use App\Support\Catalogos;
    use App\Support\Iconos;
    use Illuminate\Support\Js;

    $definicion = Catalogos::definicion($clave);
    $enUso = session('en_uso');
    $enUso = is_array($enUso) && ($enUso['clave'] ?? null) === $clave ? $enUso : null;
    $modalActivo = session('abrir_modal');

    // Campos del formulario con sus opciones resueltas (las categorías vienen del API).
    $campos = array_map(fn (array $campo) => $campo + ['lista' => is_array($campo['opciones'] ?? null) ? $campo['opciones'] : ($opciones[$campo['opciones'] ?? ''] ?? [])], $definicion['campos']);
    $vacio = array_fill_keys(array_column($campos, 'nombre'), '') + ['id' => ''];
    $inicial = $modalActivo === 'catalogo-editar' ? array_merge($vacio, array_intersect_key(old(), $vacio), ['id' => old('editar_id', '')]) : [];
@endphp
{{--
    Administrador de un catálogo: lo usan WEB-06 (categorías y habilidades) y WEB-07 (los ocho catálogos). Trae el botón
    de alta, la tabla (o una tabla por grupo), la ventana de alta y edición y la confirmación para eliminar.
--}}
<div class="catalogo" data-catalogo="{{ $clave }}">
    @if ($enUso)
        {{-- Eliminar un registro en uso responde 409: no se borra y se ofrece desactivarlo. --}}
        <div class="aviso-en-uso" role="alert" tabindex="-1" x-data x-init="$nextTick(() => $el.focus())">
            {!! Iconos::svg('alerta', 20) !!}
            <p>No se puede eliminar «{{ $enUso['nombre'] }}» porque está en uso; puedes desactivarlo.</p>
            <form method="POST" action="{{ route('catalogo.activar', [$clave, $enUso['id']]) }}">
                @csrf
                @method('PATCH')
                <input type="hidden" name="activo" value="0">
                <x-boton tipo="submit" variante="secundario">Desactivar «{{ $enUso['nombre'] }}»</x-boton>
            </form>
        </div>
    @endif

    <div class="catalogo-acciones">
        <x-boton @click="$dispatch('abrir-modal', 'catalogo-nuevo')" aria-haspopup="dialog">{{ $definicion['nuevo'] }}</x-boton>
    </div>

    @if ($grupos !== null)
        @forelse ($grupos as $categoria => $filasGrupo)
            <section class="catalogo-grupo" aria-labelledby="grupo-{{ $categoria }}">
                <h3 id="grupo-{{ $categoria }}" class="catalogo-grupo-titulo">{{ Catalogos::CATEGORIAS_AJUSTE[$categoria] }}</h3>
                <x-catalogo-tabla :definicion="$definicion" :filas="$filasGrupo" :caption="$definicion['titulo'].': '.Catalogos::CATEGORIAS_AJUSTE[$categoria]" />
            </section>
        @empty
            <p class="texto-suave">No hay registros que mostrar.</p>
        @endforelse
    @else
        <x-catalogo-tabla :definicion="$definicion" :filas="$filas" :caption="$definicion['titulo']" />
    @endif

    {{-- Alta --}}
    <x-modal id="catalogo-nuevo" :titulo="$definicion['nuevo']" :abierto="$modalActivo === 'catalogo-nuevo'">
        <form method="POST" action="{{ route('catalogo.guardar', $clave) }}" novalidate>
            @csrf
            <input type="hidden" name="modal" value="catalogo-nuevo">
            @foreach ($campos as $campo)
                <x-campo :nombre="$campo['nombre']" :id="'nuevo-'.$campo['nombre']" :etiqueta="$campo['etiqueta']" :tipo="$campo['tipo']" :opciones="$campo['lista']" vacio="Elige una opción"
                         :obligatorio="$campo['obligatorio'] ?? false" :maxlength="$campo['maximo'] ?? null" :ayuda="$campo['ayuda'] ?? null" autocomplete="off"
                         :sinAntiguos="$modalActivo !== 'catalogo-nuevo'" :error="$modalActivo === 'catalogo-nuevo' ? $errors->first($campo['nombre']) : ''" />
            @endforeach
            <div class="modal-actions">
                <x-boton variante="secundario" @click="$dispatch('cerrar-modal', 'catalogo-nuevo')">Cancelar</x-boton>
                <x-boton tipo="submit">Guardar</x-boton>
            </div>
        </form>
    </x-modal>

    {{-- Edición: los campos se llenan con los datos de la fila que se eligió. --}}
    <div x-data="catalogoEdicion({ plantilla: @js(route('catalogo.actualizar', [$clave, '__ID__'])), vacio: @js($vacio), inicial: @js($inicial) })"
         @editar-elemento.window="abrir($event.detail)">
        <x-modal id="catalogo-editar" :titulo="$definicion['editar']" :abierto="$modalActivo === 'catalogo-editar'">
            <form method="POST" action="{{ route('catalogo.actualizar', [$clave, 0]) }}" :action="accion" novalidate>
                @csrf
                @method('PUT')
                <input type="hidden" name="modal" value="catalogo-editar">
                <input type="hidden" name="editar_id" x-model="item.id">
                @foreach ($campos as $campo)
                    <x-campo :nombre="$campo['nombre']" :id="'editar-'.$campo['nombre']" :etiqueta="$campo['etiqueta']" :tipo="$campo['tipo']" :opciones="$campo['lista']" vacio="Elige una opción"
                             :obligatorio="$campo['obligatorio'] ?? false" :maxlength="$campo['maximo'] ?? null" :ayuda="$campo['ayuda'] ?? null" autocomplete="off"
                             :sinAntiguos="true" :error="$modalActivo === 'catalogo-editar' ? $errors->first($campo['nombre']) : ''" x-model="item.{{ $campo['nombre'] }}" />
                @endforeach
                <div class="modal-actions">
                    <x-boton variante="secundario" @click="$dispatch('cerrar-modal', 'catalogo-editar')">Cancelar</x-boton>
                    <x-boton tipo="submit">Guardar cambios</x-boton>
                </div>
            </form>
        </x-modal>
    </div>

    {{-- Eliminar: una confirmación por registro, fuera de la tabla. --}}
    @foreach ($grupos !== null ? array_merge(...array_values($grupos ?: [[]])) : $filas as $fila)
        <x-confirmacion :id="'catalogo-eliminar-'.$fila['id']" :titulo="'¿Eliminar «'.$fila['nombre'].'»?'"
                        mensaje="Se borra de forma definitiva. Si está en uso no se puede eliminar; en ese caso puedes desactivarlo."
                        textoConfirmar="Eliminar" variante="peligro" :accion="route('catalogo.eliminar', [$clave, $fila['id']])" metodo="DELETE">
            <input type="hidden" name="nombre" value="{{ $fila['nombre'] }}">
        </x-confirmacion>
    @endforeach
</div>

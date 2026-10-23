@props(['definicion', 'filas', 'caption'])
@php
    use Illuminate\Support\Js;

    $clave = $definicion['clave'];
    $columnas = array_merge(['Nombre'], $definicion['extras'], ['En uso', 'Estado', 'Acciones']);
@endphp
{{-- Tabla de un catálogo: nombre, campos propios del tipo, «En uso», estado y acciones (Editar, Activar o Desactivar, Eliminar). --}}
<x-tabla :caption="$caption" :columnas="$columnas" class="tabla-compacta tabla-catalogo" mensajeVacio="No hay registros que mostrar.">
    @foreach ($filas as $fila)
        <tr data-fila="{{ $fila['id'] }}">
            <td class="celda-nombre">{{ $fila['nombre'] }}</td>
            @foreach ($fila['celdas'] as $celda)
                <td>{{ $celda }}</td>
            @endforeach
            <td>{{ $fila['uso'] }}</td>
            <td><x-insignia-estado :entidad="$definicion['entidad']" :valor="$fila['activo'] ? 'activo' : 'inactivo'" /></td>
            <td>
                <div class="acciones-fila">
                    <x-boton variante="texto" @click="$dispatch('editar-elemento', {{ Js::from($fila['datos']) }})" aria-haspopup="dialog">Editar<span class="visually-hidden"> «{{ $fila['nombre'] }}»</span></x-boton>
                    <form method="POST" action="{{ route('catalogo.activar', [$clave, $fila['id']]) }}" class="formulario-en-linea">
                        @csrf
                        @method('PATCH')
                        <input type="hidden" name="activo" value="{{ $fila['activo'] ? 0 : 1 }}">
                        <x-boton tipo="submit" variante="texto">{{ $fila['activo'] ? 'Desactivar' : 'Activar' }}<span class="visually-hidden"> «{{ $fila['nombre'] }}»</span></x-boton>
                    </form>
                    <x-boton variante="texto" class="boton-eliminar" @click="$dispatch('abrir-modal', 'catalogo-eliminar-{{ $fila['id'] }}')" aria-haspopup="dialog">Eliminar<span class="visually-hidden"> «{{ $fila['nombre'] }}»</span></x-boton>
                </div>
            </td>
        </tr>
    @endforeach
</x-tabla>

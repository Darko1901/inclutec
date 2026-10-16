@props(['caption', 'columnas' => [], 'vacia' => null, 'mensajeVacio' => 'No hay resultados.', 'captionVisible' => false])
@php
    // Sin filas en el contenido (o `vacia` en true) se muestra la fila de estado vacío.
    $sinDatos = $vacia ?? ! $slot->hasActualContent();
@endphp
{{-- La región con nombre es enfocable para poder desplazar la tabla con el teclado cuando es más ancha que la pantalla. --}}
<div class="table-wrapper" tabindex="0" role="region" aria-label="{{ $caption }}">
    <table {{ $attributes }}>
        <caption @class(['visually-hidden' => ! $captionVisible, 'tabla-caption' => $captionVisible])>{{ $caption }}</caption>
        <thead>
            <tr>
                @foreach ($columnas as $columna)
                    <th scope="col">{{ $columna }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @if ($sinDatos)
                <tr class="tabla-vacia">
                    <td colspan="{{ max(1, count($columnas)) }}">{{ $mensajeVacio }}</td>
                </tr>
            @else
                {{ $slot }}
            @endif
        </tbody>
    </table>
</div>

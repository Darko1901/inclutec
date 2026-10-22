@extends('layouts.admin_layout')
@section('titulo', 'Vacantes')
@section('content')
@php
    use App\Support\Fechas;
    use App\Support\Iconos;
@endphp

<x-encabezado-pagina titulo="Vacantes" descripcion="Todas las vacantes de la plataforma. Revísalas y suspende las que no cumplan las reglas." />

<x-filtros buscar="Buscar por título" placeholderBusqueda="Título de la vacante" etiqueta="Buscar vacantes" :total="$pagina['total']"
           :selects="[
               ['nombre' => 'empresa_id', 'etiqueta' => 'Empresa', 'opciones' => $opcionesEmpresa, 'todas' => 'Todas las empresas'],
               ['nombre' => 'estado', 'etiqueta' => 'Estado', 'opciones' => $opcionesEstado, 'todas' => 'Todos los estados'],
               ['nombre' => 'categoria_id', 'etiqueta' => 'Categoría', 'opciones' => $opcionesCategoria, 'todas' => 'Todas las categorías'],
               ['nombre' => 'modalidad_id', 'etiqueta' => 'Modalidad', 'opciones' => $opcionesModalidad, 'todas' => 'Todas las modalidades'],
           ]">
    <div class="casilla">
        <input type="checkbox" id="con_reportes" name="con_reportes" value="1" @checked(request()->boolean('con_reportes'))>
        <label for="con_reportes">Solo con reportes abiertos</label>
    </div>
</x-filtros>

<x-tabla caption="Vacantes" class="tabla-compacta"
         :columnas="['Título', 'Empresa', 'Categoría', 'Modalidad', 'Estado', 'Fecha de publicación', 'Postulados', 'Reportes abiertos', 'Acciones']"
         mensajeVacio="No se encontraron vacantes con esos filtros.">
    @foreach ($pagina['items'] as $vacante)
        <tr>
            <td class="celda-nombre">{{ $vacante['titulo'] }}</td>
            <td>{{ $vacante['empresa']['nombre_comercial'] }}</td>
            <td>{{ $vacante['categoria']['nombre'] }}</td>
            <td>{{ $vacante['modalidad']['nombre'] }}</td>
            <td><x-insignia-estado entidad="vacante" :valor="$vacante['estado']" /></td>
            <td>
                @if ($vacante['publicada_en'])
                    {{ Fechas::dia($vacante['publicada_en']) }}
                @else
                    <span aria-hidden="true">—</span><span class="visually-hidden">Sin publicar</span>
                @endif
            </td>
            <td>{{ number_format($vacante['postulados']) }}</td>
            <td>
                @if ($vacante['reportes_abiertos'] > 0)
                    {{-- Resaltado con icono y negritas, no solo con color. --}}
                    <span class="reportes-resaltados">{!! Iconos::svg('alerta', 14) !!}{{ number_format($vacante['reportes_abiertos']) }}</span>
                @else
                    0
                @endif
            </td>
            <td>
                <div class="acciones-fila">
                    <x-boton variante="texto" :href="route('vacantes.ver', $vacante['id'])">Ver<span class="visually-hidden"> la vacante {{ $vacante['titulo'] }}</span></x-boton>
                </div>
            </td>
        </tr>
    @endforeach
</x-tabla>

<x-paginacion :total="$pagina['total']" :page="$pagina['page']" :size="$pagina['size']" />
@endsection

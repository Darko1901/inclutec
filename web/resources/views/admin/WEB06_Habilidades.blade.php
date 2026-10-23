@extends('layouts.admin_layout')
@section('titulo', 'Categorías y habilidades')
@section('content')
@php use App\Support\Catalogos; @endphp

<x-encabezado-pagina titulo="Categorías y habilidades" descripcion="Las áreas laborales de las vacantes y las habilidades que piden las vacantes y registran los candidatos. Lo que se desactiva deja de ofrecerse en registros nuevos." />

<nav class="pestanas" aria-label="Sección">
    <ul class="pestanas-lista">
        @foreach (Catalogos::SECCIONES as $valor => $nombre)
            <li>
                <a href="{{ route('habilidades', array_filter(['seccion' => $valor, 'q' => $q])) }}" class="pestana" @if ($valor === $seccion) aria-current="page" @endif>
                    {{ $nombre }} <span class="pestana-total">({{ number_format($totales[$valor]) }})</span>
                </a>
            </li>
        @endforeach
    </ul>
</nav>

<x-filtros buscar="Buscar por nombre" placeholderBusqueda="Nombre" :etiqueta="'Buscar en '.mb_strtolower(Catalogos::SECCIONES[$seccion])" :accion="route('habilidades', ['seccion' => $seccion])" :total="$pagina['total']"
           :selects="$seccion === 'habilidades' ? [['nombre' => 'categoria_id', 'etiqueta' => 'Categoría', 'opciones' => $opcionesCategoria, 'todas' => 'Todas las categorías']] : []">
    <input type="hidden" name="seccion" value="{{ $seccion }}">
</x-filtros>

<x-catalogo :clave="$seccion" :filas="$filas" :opciones="['categorias' => $opcionesCategoria]" />

@if ($seccion === 'habilidades')
    <x-paginacion :total="$pagina['total']" :page="$pagina['page']" :size="$pagina['size']" />
@endif
@endsection

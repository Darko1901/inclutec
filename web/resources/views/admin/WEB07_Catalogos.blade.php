@extends('layouts.admin_layout')
@section('titulo', 'Catálogos')
@section('content')
@php use App\Support\Catalogos; @endphp

<x-encabezado-pagina titulo="Catálogos" descripcion="Las listas que se eligen al registrar empresas, vacantes y reportes. Lo que se desactiva deja de ofrecerse en registros nuevos; lo ya guardado no cambia." />

<div class="catalogos-diseno">
    <nav class="catalogos-lista" aria-label="Catálogos">
        <ul>
            @foreach (Catalogos::TIPOS as $valor => $nombre)
                <li>
                    <a href="{{ route('catalogos', ['tipo' => $valor]) }}" class="catalogos-enlace" @if ($valor === $tipo) aria-current="page" @endif>{{ $nombre }}</a>
                </li>
            @endforeach
        </ul>
    </nav>

    <div class="catalogos-contenido">
        <h2 class="catalogo-titulo">{{ Catalogos::TIPOS[$tipo] }}</h2>
        @if ($tipo === 'ajustes')
            <p class="texto-suave catalogo-nota">Cada ajuste se describe en lenguaje claro y se agrupa por categoría.</p>
        @endif
        <x-catalogo :clave="$tipo" :filas="$filas" :grupos="$grupos" />
    </div>
</div>
@endsection

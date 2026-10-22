@extends('layouts.admin_layout')
@section('titulo', $empresa ? 'Editar empresa' : 'Nueva empresa')
@section('content')
@php
    use App\Support\Iconos;

    $edita = $empresa !== null;
    $ayudaFiscal = $edita && $empresa['estado'] === 'validada' ? 'Como administrador puedes corregir este dato aunque la empresa ya esté validada.' : null;
@endphp

<nav class="breadcrumb" aria-label="Ruta de navegación">
    <a href="{{ route('empresas', $edita ? ['estado' => $empresa['estado']] : []) }}">Empresas</a>
    {!! Iconos::svg('flecha-derecha', 14) !!}
    <span aria-current="page">{{ $edita ? 'Editar' : 'Nueva empresa' }}</span>
</nav>

<x-encabezado-pagina :titulo="$edita ? 'Editar empresa' : 'Nueva empresa'"
                     :descripcion="$edita ? 'Cambia los datos de '.$empresa['nombre_comercial'].'.' : 'La empresa se crea ya validada, sin pasar por la cola de revisión.'" />

<div class="card formulario-usuario">
    <x-resumen-errores />

    <form method="POST" action="{{ $edita ? route('empresas.actualizar', $empresa['id']) : route('empresas.guardar') }}" novalidate>
        @csrf
        @if ($edita)
            @method('PUT')
        @endif

        <x-campo nombre="razon_social" etiqueta="Razón social" :valor="$empresa['razon_social'] ?? ''" maximo="200" obligatorio autocomplete="off" :ayuda="$ayudaFiscal" />
        <x-campo nombre="nombre_comercial" etiqueta="Nombre comercial" :valor="$empresa['nombre_comercial'] ?? ''" maximo="150" obligatorio autocomplete="off" />
        <x-campo nombre="rfc" etiqueta="RFC" :valor="$empresa['rfc'] ?? ''" obligatorio autocomplete="off" autocapitalize="characters" spellcheck="false"
                 :ayuda="$ayudaFiscal ?? 'De 12 o 13 caracteres, sin espacios. Ejemplo: TQU150312AB1.'" />
        <x-campo nombre="sector_id" etiqueta="Sector" tipo="select" :opciones="$sectores" vacio="Elige un sector" :valor="$empresa['sector']['id'] ?? ''" obligatorio />
        <x-campo nombre="tamano_empresa_id" etiqueta="Tamaño de la empresa" tipo="select" :opciones="$tamanos" vacio="Elige un tamaño" :valor="$empresa['tamano_empresa']['id'] ?? ''" obligatorio />
        <x-campo nombre="municipio_id" etiqueta="Municipio" tipo="select" :opciones="$municipios" vacio="Elige un municipio" :valor="$empresa['municipio']['id'] ?? ''" obligatorio />
        <x-campo nombre="direccion" etiqueta="Dirección" :valor="$empresa['direccion'] ?? ''" maximo="255" autocomplete="off" ayuda="Opcional." />
        <x-campo nombre="sitio_web" etiqueta="Sitio web" tipo="url" :valor="$empresa['sitio_web'] ?? ''" autocomplete="off" ayuda="Opcional. Con https://, por ejemplo https://empresa.mx." />
        <x-campo nombre="descripcion" etiqueta="Descripción" tipo="textarea" :valor="$empresa['descripcion'] ?? ''" maximo="1000" ayuda="Opcional." />
        <x-campo nombre="practicas_inclusion" etiqueta="Prácticas de inclusión" tipo="textarea" :valor="$empresa['practicas_inclusion'] ?? ''" maximo="1000"
                 ayuda="Opcional. Cómo apoya la empresa a las personas con discapacidad." />

        <div class="formulario-acciones">
            <x-boton tipo="submit">{{ $edita ? 'Guardar cambios' : 'Crear empresa' }}</x-boton>
            <x-boton variante="secundario" :href="$edita ? route('empresas.ver', $empresa['id']) : route('empresas')">Cancelar</x-boton>
        </div>
    </form>
</div>
@endsection

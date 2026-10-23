@extends('layouts.admin_layout')
@section('titulo', 'Cambiar contraseña')
@section('content')
<x-encabezado-pagina titulo="Cambiar contraseña" descripcion="Elige una contraseña nueva para tu cuenta de administrador." />

<div class="card formulario-usuario">
    <x-resumen-errores />

    <form method="POST" action="{{ route('perfil.actualizar') }}" novalidate>
        @csrf
        @method('PUT')

        <x-campo nombre="contrasena_actual" etiqueta="Contraseña actual" tipo="password" autocomplete="current-password" obligatorio />
        <x-campo nombre="contrasena_nueva" etiqueta="Contraseña nueva" tipo="password" autocomplete="new-password" obligatorio
                 ayuda="De 8 a 64 caracteres, con al menos una letra y un número." />
        <x-campo nombre="contrasena_nueva_confirmation" etiqueta="Confirma la contraseña nueva" tipo="password" autocomplete="new-password" obligatorio />

        <x-boton tipo="submit">Cambiar contraseña</x-boton>
    </form>
</div>
@endsection

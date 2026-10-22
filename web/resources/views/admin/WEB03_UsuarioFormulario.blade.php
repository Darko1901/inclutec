@extends('layouts.admin_layout')
@section('titulo', $usuario ? 'Editar usuario' : 'Nuevo usuario')
@section('content')
@php
    use App\Support\Iconos;

    $edita = $usuario !== null;
    $rolInicial = old('rol', $usuario['rol'] ?? '');
@endphp

<nav class="breadcrumb" aria-label="Ruta de navegación">
    <a href="{{ route('usuarios') }}">Usuarios</a>
    {!! Iconos::svg('flecha-derecha', 14) !!}
    <span aria-current="page">{{ $edita ? 'Editar' : 'Nuevo usuario' }}</span>
</nav>

<x-encabezado-pagina :titulo="$edita ? 'Editar usuario' : 'Nuevo usuario'"
                     :descripcion="$edita ? 'Cambia los datos de '.trim($usuario['nombre'].' '.$usuario['apellidos']).'.' : 'Crea una cuenta de candidato, reclutador o administrador.'" />

<div class="card formulario-usuario">
    <x-resumen-errores />

    <form method="POST" action="{{ $edita ? route('usuarios.actualizar', $usuario['id']) : route('usuarios.guardar') }}" novalidate
          x-data="{ rol: @js($rolInicial) }">
        @csrf
        @if ($edita)
            @method('PUT')
        @endif

        <x-campo nombre="rol" etiqueta="Rol" tipo="select" :opciones="$roles" vacio="Elige un rol" :valor="$usuario['rol'] ?? ''" obligatorio x-model="rol"
                 :ayuda="$edita ? 'Solo se puede cambiar si la persona no tiene postulaciones ni vacantes.' : null" />
        <x-campo nombre="nombre" etiqueta="Nombre" :valor="$usuario['nombre'] ?? ''" obligatorio autocomplete="off" />
        <x-campo nombre="apellidos" etiqueta="Apellidos" :valor="$usuario['apellidos'] ?? ''" obligatorio autocomplete="off" />
        <x-campo nombre="correo" etiqueta="Correo" tipo="email" :valor="$usuario['correo'] ?? ''" obligatorio autocomplete="off" />
        <x-campo nombre="telefono" etiqueta="Teléfono" tipo="tel" :valor="$usuario['telefono'] ?? ''" inputmode="numeric" autocomplete="off"
                 ayuda="Opcional. 10 dígitos, sin espacios ni guiones." />
        @unless ($edita)
            <x-campo nombre="contrasena" etiqueta="Contraseña" tipo="password" obligatorio autocomplete="new-password"
                     ayuda="De 8 a 64 caracteres. La persona podrá cambiarla después." />
        @endunless

        <div x-show="rol === 'reclutador'" x-cloak class="campos-reclutador">
            <x-campo nombre="empresa_id" etiqueta="Empresa" tipo="select" :opciones="$empresas" vacio="Elige una empresa" :valor="$usuario['empresa']['id'] ?? ''"
                     obligatorio x-bind:disabled="rol !== 'reclutador'"
                     :ayuda="$edita ? 'Si cambias el rol, la persona se desvincula de su empresa.' : null" />
            <x-campo nombre="puesto" etiqueta="Puesto" :valor="$puesto ?? ''" maximo="100" obligatorio x-bind:disabled="rol !== 'reclutador'" autocomplete="off" />
        </div>

        <div class="formulario-acciones">
            <x-boton tipo="submit">{{ $edita ? 'Guardar cambios' : 'Crear usuario' }}</x-boton>
            <x-boton variante="secundario" :href="$edita ? route('usuarios.ver', $usuario['id']) : route('usuarios')">Cancelar</x-boton>
        </div>
    </form>
</div>
@endsection

@extends('layouts.admin_layout')
@section('titulo', 'Usuarios')
@section('content')
@php
    use App\Support\Fechas;
    use App\Support\Roles;
@endphp

<x-encabezado-pagina titulo="Usuarios" descripcion="Candidatos, reclutadores y administradores de la plataforma.">
    <x-boton :href="route('usuarios.crear')">Nuevo usuario</x-boton>
</x-encabezado-pagina>

<x-filtros buscar="Buscar por nombre o correo" placeholderBusqueda="Nombre, apellidos o correo" etiqueta="Buscar usuarios" :total="$pagina['total']"
           :selects="[
               ['nombre' => 'rol', 'etiqueta' => 'Rol', 'opciones' => $opcionesRol, 'todas' => 'Todos los roles'],
               ['nombre' => 'estado', 'etiqueta' => 'Estado', 'opciones' => $opcionesEstado, 'todas' => 'Todos los estados'],
           ]" />

<x-tabla caption="Usuarios" :columnas="['Nombre', 'Correo', 'Rol', 'Empresa', 'Fecha de registro', 'Estado', 'Acciones']"
         mensajeVacio="No se encontraron usuarios con esos filtros." class="tabla-usuarios">
    @foreach ($pagina['items'] as $usuario)
        @php($nombre = trim($usuario['nombre'].' '.$usuario['apellidos']))
        <tr>
            <td class="celda-nombre">{{ $nombre }}</td>
            <td>{{ $usuario['correo'] }}</td>
            <td>{{ Roles::texto($usuario['rol']) }}</td>
            <td>
                @if ($usuario['empresa'])
                    {{ $usuario['empresa']['nombre_comercial'] }}
                @else
                    <span aria-hidden="true">—</span><span class="visually-hidden">No aplica</span>
                @endif
            </td>
            <td>{{ Fechas::dia($usuario['creado_en']) }}</td>
            <td><x-insignia-estado entidad="usuario" :valor="$usuario['estado']" /></td>
            <td>
                <div class="acciones-fila">
                    <x-boton variante="texto" :href="route('usuarios.ver', $usuario['id'])">Ver<span class="visually-hidden"> a {{ $nombre }}</span></x-boton>
                    <x-boton variante="texto" :href="route('usuarios.editar', $usuario['id'])">Editar<span class="visually-hidden"> a {{ $nombre }}</span></x-boton>
                    <x-usuario-botones :usuario="$usuario" />
                </div>
            </td>
        </tr>
    @endforeach
</x-tabla>

<x-paginacion :total="$pagina['total']" :page="$pagina['page']" :size="$pagina['size']" />

{{-- Las confirmaciones van fuera de la tabla para que su texto no herede el ajuste de las celdas. --}}
@foreach ($pagina['items'] as $usuario)
    <x-usuario-confirmaciones :usuario="$usuario" />
@endforeach
@endsection

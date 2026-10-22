@props(['usuario'])
@php
    use App\Support\AccionesUsuario;

    $nombre = trim($usuario['nombre'].' '.$usuario['apellidos']);
    $acciones = AccionesUsuario::todas();
@endphp
{{-- Botones de estado de un usuario (Suspender, Reactivar o Dar de baja). Cada uno abre su confirmación, que dibuja <x-usuario-confirmaciones> fuera de la tabla. --}}
@foreach (AccionesUsuario::disponibles($usuario['estado']) as $clave)
    <x-boton variante="texto" @click="$dispatch('abrir-modal', 'estado-{{ $usuario['id'] }}-{{ $clave }}')" aria-haspopup="dialog">{{ $acciones[$clave]['boton'] }}<span class="visually-hidden"> a {{ $nombre }}</span></x-boton>
@endforeach

@props(['empresa'])
@php use App\Support\Empresas; @endphp
{{-- Botones de estado de una empresa (Validar, Rechazar, Suspender o Reactivar). Cada uno abre su confirmación (<x-empresa-confirmaciones>). --}}
@foreach (Empresas::disponibles($empresa['estado']) as $clave)
    @php($accion = Empresas::acciones()[$clave])
    <x-boton :variante="$accion['variante']" @click="$dispatch('abrir-modal', 'empresa-{{ $empresa['id'] }}-{{ $clave }}')" aria-haspopup="dialog">{{ $accion['boton'] }}</x-boton>
@endforeach

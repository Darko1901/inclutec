@props(['vacante'])
@php use App\Support\AccionesVacante; @endphp
{{-- Botones de moderación de una vacante (Suspender o Reactivar); cada uno abre su confirmación (<x-vacante-confirmaciones>). --}}
@foreach (AccionesVacante::disponibles($vacante['estado']) as $clave)
    @php($accion = AccionesVacante::todas()[$clave])
    <x-boton :variante="$accion['variante']" @click="$dispatch('abrir-modal', 'vacante-{{ $vacante['id'] }}-{{ $clave }}')" aria-haspopup="dialog">{{ $accion['boton'] }}</x-boton>
@endforeach

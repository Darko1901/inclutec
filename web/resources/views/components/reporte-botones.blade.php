@props(['reporte', 'elemento'])
@php use App\Support\Reportes; @endphp
{{-- Seguimiento del reporte (Tomar en revisión, Resolver, Descartar) según su estado; cada botón abre su confirmación (<x-reporte-confirmaciones>). --}}
@foreach (Reportes::disponibles($reporte['estado']) as $clave)
    @php($accion = Reportes::acciones()[$clave])
    <x-boton :variante="$accion['variante']" @click="$dispatch('abrir-modal', 'reporte-{{ $reporte['id'] }}-{{ $clave }}')" aria-haspopup="dialog">{{ $accion['boton'] }}</x-boton>
@endforeach

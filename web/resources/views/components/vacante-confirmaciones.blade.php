@props(['vacante'])
@php use App\Support\AccionesVacante; @endphp
{{-- Suspender pide motivo; reactivar no. --}}
@foreach (AccionesVacante::disponibles($vacante['estado']) as $clave)
    @php($accion = AccionesVacante::todas()[$clave])
    @php($idModal = 'vacante-'.$vacante['id'].'-'.$clave)
    <x-confirmacion :id="$idModal" :titulo="str_replace(':titulo', $vacante['titulo'], $accion['titulo'])" :mensaje="$accion['mensaje']"
                    :textoConfirmar="$accion['confirmar']" :variante="$accion['variante']"
                    :pedirMotivo="$accion['etiquetaMotivo'] !== null" :etiquetaMotivo="$accion['etiquetaMotivo'] ?? 'Motivo'"
                    :accion="route('vacantes.estado', $vacante['id'])" metodo="PATCH"
                    :abierto="session('abrir_modal') === $idModal">
        <input type="hidden" name="estado" value="{{ $accion['estado'] }}">
        <input type="hidden" name="modal" value="{{ $idModal }}">
    </x-confirmacion>
@endforeach

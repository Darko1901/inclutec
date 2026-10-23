@props(['reporte', 'elemento'])
@php use App\Support\Reportes; @endphp
{{-- Tomar en revisión no pide nada; Resolver y Descartar piden la resolución (y Resolver, la acción tomada). --}}
@foreach (Reportes::disponibles($reporte['estado']) as $clave)
    @php($accion = Reportes::acciones()[$clave])
    @php($idModal = 'reporte-'.$reporte['id'].'-'.$clave)
    <x-confirmacion :id="$idModal" :titulo="str_replace(':folio', (string) $reporte['id'], $accion['titulo'])" :mensaje="$accion['mensaje']"
                    :textoConfirmar="$accion['confirmar']" :variante="$accion['variante']"
                    :pedirMotivo="$accion['etiquetaMotivo'] !== null" :etiquetaMotivo="$accion['etiquetaMotivo'] ?? 'Resolución'"
                    campoMotivo="resolucion" :maximoMotivo="1000" mensajeVacio="Escribe la resolución para cerrar el reporte."
                    :accion="route('reportes.seguimiento', $reporte['id'])" metodo="PATCH"
                    :abierto="session('abrir_modal') === $idModal">
        <input type="hidden" name="estado" value="{{ $accion['estado'] }}">
        <input type="hidden" name="modal" value="{{ $idModal }}">
        @if ($accion['pideAccion'])
            <x-campo nombre="accion" :id="$idModal.'-accion'" etiqueta="Acción tomada" tipo="select" :opciones="Reportes::ACCIONES_TOMADAS" valor="ninguna"
                     ayuda="Si suspendiste el elemento, elige «Suspensión»; la suspensión se hace con el botón del elemento reportado." />
        @endif
    </x-confirmacion>
@endforeach

{{-- Suspender el elemento reportado, mientras el reporte siga abierto y el elemento se pueda suspender. --}}
@if ($elemento['suspendible'] && in_array($reporte['estado'], ['abierto', 'en_revision'], true))
    @php($idSuspender = 'reporte-'.$reporte['id'].'-suspender')
    <x-confirmacion :id="$idSuspender" :titulo="$elemento['suspender'].': '.$reporte['objeto']['nombre'].'?'"
                    :mensaje="match ($reporte['tipo']) {
                        'vacante' => 'Se avisará al reclutador y a las personas postuladas. Los candidatos dejarán de ver la vacante.',
                        'empresa' => 'Sus vacantes publicadas se suspenderán y se avisará a las personas postuladas.',
                        default => 'No podrá iniciar sesión hasta que lo reactives.',
                    }"
                    textoConfirmar="Suspender" variante="peligro" :pedirMotivo="true" etiquetaMotivo="Motivo de la suspensión"
                    :accion="route('reportes.suspension', $reporte['id'])" metodo="PATCH" :abierto="session('abrir_modal') === $idSuspender">
        <input type="hidden" name="modal" value="{{ $idSuspender }}">
    </x-confirmacion>
@endif

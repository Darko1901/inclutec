@props(['empresa'])
@php use App\Support\Empresas; @endphp
{{-- Una confirmación por acción disponible. Rechazar y suspender piden motivo; validar y reactivar no. --}}
@foreach (Empresas::disponibles($empresa['estado']) as $clave)
    @php($accion = Empresas::acciones()[$clave])
    @php($idModal = 'empresa-'.$empresa['id'].'-'.$clave)
    <x-confirmacion :id="$idModal" :titulo="str_replace(':nombre', $empresa['nombre_comercial'], $accion['titulo'])" :mensaje="$accion['mensaje']"
                    :textoConfirmar="$accion['confirmar']" :variante="$accion['variante']"
                    :pedirMotivo="$accion['etiquetaMotivo'] !== null" :etiquetaMotivo="$accion['etiquetaMotivo'] ?? 'Motivo'"
                    :accion="route($accion['ruta'], $empresa['id'])" metodo="PATCH"
                    :abierto="session('abrir_modal') === $idModal">
        <input type="hidden" name="{{ $accion['campo'] }}" value="{{ $accion['valor'] }}">
        <input type="hidden" name="modal" value="{{ $idModal }}">
    </x-confirmacion>
@endforeach

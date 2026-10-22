@props(['usuario'])
@php
    use App\Support\AccionesUsuario;

    $nombre = trim($usuario['nombre'].' '.$usuario['apellidos']);
    $acciones = AccionesUsuario::todas();
@endphp
{{-- Una confirmación por acción disponible. Suspender y dar de baja piden motivo; reactivar no. --}}
@foreach (AccionesUsuario::disponibles($usuario['estado']) as $clave)
    @php($accion = $acciones[$clave])
    @php($idModal = 'estado-'.$usuario['id'].'-'.$clave)
    <x-confirmacion :id="$idModal" :titulo="str_replace(':nombre', $nombre, $accion['titulo'])" :mensaje="$accion['mensaje']"
                    :textoConfirmar="$accion['confirmar']" :variante="$accion['variante']"
                    :pedirMotivo="$accion['etiquetaMotivo'] !== null" :etiquetaMotivo="$accion['etiquetaMotivo'] ?? 'Motivo'"
                    :accion="route('usuarios.estado', $usuario['id'])" metodo="PATCH"
                    :abierto="session('abrir_modal') === $idModal">
        <input type="hidden" name="estado" value="{{ $accion['estado'] }}">
        <input type="hidden" name="modal" value="{{ $idModal }}">
    </x-confirmacion>
@endforeach

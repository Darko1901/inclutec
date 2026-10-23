<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use App\Support\Empresas;
use App\Support\Reportes;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/** WEB-08 · Reportes e incidencias (GET /admin/reportes, GET y PATCH /admin/reportes/{id}). */
class ReporteController extends Controller
{
    private const TAMANO_PAGINA = 25;

    public function __construct(private readonly ApiAdmin $api) {}

    public function index(Request $request): View
    {
        $estado = $request->query('estado');
        $estado = is_string($estado) && isset(Reportes::PESTANAS[$estado]) ? $estado : 'abierto';
        $tipo = $request->query('tipo');
        $tipo = is_string($tipo) && isset(Reportes::TIPOS[$tipo]) ? $tipo : null;
        $orden = $request->query('orden');
        $orden = is_string($orden) && isset(Reportes::ORDENES[$orden]) ? $orden : 'antiguos';
        $motivos = array_column($this->api->catalogo('motivos-reporte'), 'nombre', 'id');
        $motivo = $request->query('motivo_reporte_id');
        $motivo = is_string($motivo) && ctype_digit($motivo) && isset($motivos[(int) $motivo]) ? (int) $motivo : null;
        $page = max(1, (int) $request->query('page', 1));

        $pagina = $this->api->reportes($estado, $tipo, $motivo, $orden, $page, self::TAMANO_PAGINA);

        // El número de cada pestaña respeta los filtros de tipo y motivo; la pestaña actual ya trae su total.
        $totales = [];
        foreach (array_keys(Reportes::PESTANAS) as $valor) {
            $totales[$valor] = $valor === $estado ? $pagina['total'] : $this->api->reportes($valor, $tipo, $motivo, $orden, 1, 1)['total'];
        }

        return view('admin.WEB08_Reportes', [
            'pagina' => $pagina, 'estadoActual' => $estado, 'totales' => $totales, 'opcionesMotivo' => $motivos,
            'filtrosPestana' => array_filter(['tipo' => $tipo, 'motivo_reporte_id' => $motivo, 'orden' => $orden === 'antiguos' ? null : $orden]),
        ]);
    }

    public function show(int $id): View
    {
        $detalle = $this->api->reporte($id);
        $reporte = $detalle['reporte'];

        return view('admin.WEB08_ReporteDetalle', [
            'detalle' => $detalle,
            'elemento' => Reportes::elemento($reporte['tipo'], $detalle['objeto_estado']),
        ]);
    }

    /** Tomar en revisión, resolver o descartar. */
    public function seguimiento(Request $request, int $id): RedirectResponse
    {
        $validador = Validator::make($request->all(), [
            'estado' => ['required', 'in:en_revision,resuelto,descartado'],
            'resolucion' => ['required_if:estado,resuelto,descartado', 'nullable', 'string', 'max:1000'],
            'accion' => ['nullable', 'in:ninguna,suspension'],
        ], [
            'estado.required' => 'Elige qué hacer con el reporte.',
            'estado.in' => 'Elige qué hacer con el reporte.',
            'resolucion.required_if' => 'Escribe la resolución para cerrar el reporte.',
            'resolucion.max' => 'La resolución debe tener máximo 1000 caracteres.',
            'accion.in' => 'Elige la acción tomada: ninguna o suspensión.',
        ]);
        if ($validador->fails()) {
            return $this->conModalAbierto(back()->withErrors($validador)->withInput(), $request);
        }
        $resolucion = trim((string) $request->input('resolucion'));

        try {
            $detalle = $this->api->seguimientoReporte(
                $id,
                $request->input('estado'),
                null,
                $resolucion === '' ? null : $resolucion,
                $request->input('estado') === 'resuelto' ? ($request->input('accion') ?: 'ninguna') : null,
            );
        } catch (ApiError $error) {
            return match ($error->codigo) {
                // El reporte ya cambió de estado (por ejemplo, otra persona lo cerró).
                'transicion_invalida' => back()->with('error', $error->detail),
                'validacion' => $this->conModalAbierto(back()->withErrors($error->campos ?: ['resolucion' => $error->detail])->withInput(), $request),
                default => throw $error,
            };
        }

        $accion = Reportes::acciones()[Reportes::paraEstado($detalle['reporte']['estado'])];

        return redirect()->route('reportes.ver', $id)->with('exito', str_replace(':folio', (string) $id, $accion['exito']));
    }

    /** Suspende el elemento reportado con el endpoint de su tipo (vacante, empresa o usuario). */
    public function suspension(Request $request, int $id): RedirectResponse
    {
        $validador = Validator::make($request->all(), ['motivo' => ['required', 'string', 'max:255']], [
            'motivo.required' => 'Escribe el motivo de la suspensión.',
            'motivo.max' => 'El motivo debe tener máximo 255 caracteres.',
        ]);
        if ($validador->fails()) {
            return $this->conModalAbierto(back()->withErrors($validador)->withInput(), $request);
        }
        $motivo = trim($request->input('motivo'));

        $detalle = $this->api->reporte($id);
        $tipo = $detalle['reporte']['tipo'];
        $objeto = $detalle['reporte']['objeto'];
        if (! Reportes::elemento($tipo, $detalle['objeto_estado'])['suspendible']) {
            return back()->with('error', 'Este elemento ya no se puede suspender: revisa su estado actual.');
        }

        try {
            $aviso = match ($tipo) {
                'vacante' => $this->suspenderVacante($objeto, $motivo),
                'empresa' => $this->suspenderEmpresa($objeto, $motivo),
                default => $this->suspenderUsuario($objeto, $motivo),
            };
        } catch (ApiError $error) {
            return match ($error->codigo) {
                'transicion_invalida', 'estado_invalido' => back()->with('error', $error->detail),
                'validacion' => $this->conModalAbierto(back()->withErrors($error->campos ?: ['motivo' => $error->detail])->withInput(), $request),
                default => throw $error,
            };
        }

        return redirect()->route('reportes.ver', $id)->with('exito', $aviso);
    }

    /** @param  array{id: int, nombre: string}  $objeto */
    private function suspenderVacante(array $objeto, string $motivo): string
    {
        $vacante = $this->api->moderarVacante($objeto['id'], 'suspendida', $motivo);

        return "Se suspendió la vacante «{$vacante['titulo']}». Se avisará al reclutador y a las personas postuladas.";
    }

    /** @param  array{id: int, nombre: string}  $objeto */
    private function suspenderEmpresa(array $objeto, string $motivo): string
    {
        $resultado = $this->api->cambiarEstadoEmpresa($objeto['id'], 'suspendida', $motivo);

        return "Se suspendió a {$resultado['empresa']['nombre_comercial']}: "
            .Empresas::plural($resultado['vacantes_suspendidas'], 'vacante suspendida', 'vacantes suspendidas').' y '
            .Empresas::plural($resultado['postulados_notificados'], 'persona postulada notificada', 'personas postuladas notificadas').'.';
    }

    /** @param  array{id: int, nombre: string}  $objeto */
    private function suspenderUsuario(array $objeto, string $motivo): string
    {
        $usuario = $this->api->cambiarEstadoUsuario($objeto['id'], 'suspendido', $motivo);

        return 'Se suspendió a '.trim($usuario['nombre'].' '.$usuario['apellidos']).'.';
    }

    /** Vuelve a abrir la confirmación que se envió, para que el error se vea donde se escribió. */
    private function conModalAbierto(RedirectResponse $respuesta, Request $request): RedirectResponse
    {
        return $respuesta->with('abrir_modal', (string) $request->input('modal'));
    }
}

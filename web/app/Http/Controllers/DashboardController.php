<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Support\PeriodoEstadisticas;
use App\Support\PresentadorEstadisticas;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\MessageBag;
use Illuminate\Support\ViewErrorBag;

/** WEB-02 · Dashboard y estadísticas (GET /admin/estadisticas/resumen y /exportar). */
class DashboardController extends Controller
{
    public function __construct(private readonly ApiAdmin $api) {}

    public function index(Request $request): View
    {
        $periodo = PeriodoEstadisticas::desdeConsulta($request->query());
        $estadisticas = $this->api->estadisticas($periodo->desde, $periodo->hasta);

        // Los errores del periodo se muestran en esta misma respuesta (sin redirigir) y los leen los
        // componentes del formulario, que toman `$errors` de los datos compartidos.
        view()->share('errors', (new ViewErrorBag)->put('default', new MessageBag($periodo->errores)));

        return view('admin.WEB02_Dashboard', [
            'periodo' => $periodo,
            'estadisticas' => $estadisticas,
            'indicadores' => PresentadorEstadisticas::indicadores($estadisticas),
            'pendientes' => $estadisticas['pendientes'],
            'graficasVinculacion' => PresentadorEstadisticas::graficasVinculacion($estadisticas),
            'graficasBrecha' => PresentadorEstadisticas::graficasBrecha($estadisticas),
        ]);
    }

    /** Reenvía al navegador el archivo que arma el API, con su tipo y su nombre. */
    public function exportar(Request $request): Response|RedirectResponse
    {
        $formato = $request->query('formato');
        $periodo = PeriodoEstadisticas::desdeConsulta($request->query());

        if (! in_array($formato, ['pdf', 'xlsx'], true) || $periodo->errores !== []) {
            return redirect()->route('dashboard', $periodo->parametros())
                ->with('error', in_array($formato, ['pdf', 'xlsx'], true)
                    ? 'No se pudo exportar: revisa el periodo.'
                    : 'Elige el formato de exportación: PDF o XLSX.');
        }

        $archivo = $this->api->exportarEstadisticas($formato, $periodo->desde, $periodo->hasta);

        return response($archivo['contenido'], 200, [
            'Content-Type' => $archivo['tipo'],
            'Content-Disposition' => 'attachment; filename="'.str_replace(['"', '\\', "\r", "\n"], '', $archivo['nombre']).'"',
            'Content-Length' => (string) strlen($archivo['contenido']),
        ]);
    }
}

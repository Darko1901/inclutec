<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use App\Support\Empresas;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

/** WEB-04 · Empresas y validación (GET, POST y PUT /admin/empresas, PATCH /validacion y /estado). */
class EmpresaController extends Controller
{
    private const TAMANO_PAGINA = 25;

    public function __construct(private readonly ApiAdmin $api) {}

    public function index(Request $request): View
    {
        $estado = $request->query('estado');
        $estado = is_string($estado) && isset(Empresas::PESTANAS[$estado]) ? $estado : 'pendiente';
        $texto = $request->query('q');
        $q = is_string($texto) ? mb_substr(trim($texto), 0, 100) : '';
        $page = max(1, (int) $request->query('page', 1));

        $pagina = $this->api->listarEmpresas($q ?: null, $estado, null, $page, self::TAMANO_PAGINA);

        // El número de cada pestaña respeta la búsqueda; la pestaña actual ya trae su total.
        $totales = [];
        foreach (array_keys(Empresas::PESTANAS) as $valor) {
            $totales[$valor] = $valor === $estado ? $pagina['total'] : $this->api->listarEmpresas($q ?: null, $valor, null, 1, 1)['total'];
        }

        return view('admin.WEB04_Empresas', ['pagina' => $pagina, 'estadoActual' => $estado, 'q' => $q, 'totales' => $totales]);
    }

    public function show(int $id): View
    {
        $detalle = $this->api->empresa($id);

        return view('admin.WEB04_EmpresaRevision', [
            'detalle' => $detalle,
            'rfcValido' => Empresas::rfcValido($detalle['empresa']['rfc']),
        ]);
    }

    /** Reenvía la constancia con el token de la sesión: el navegador nunca lo recibe. */
    public function constancia(int $id): Response
    {
        $ruta = $this->api->empresa($id)['empresa']['documento_url'];
        abort_if($ruta === null, 404, 'Esta empresa todavía no ha subido su constancia de situación fiscal.');

        $archivo = $this->api->archivo($ruta);

        return response($archivo['contenido'], 200, [
            'Content-Type' => $archivo['tipo'],
            'Content-Disposition' => 'inline; filename="constancia-empresa-'.$id.'.pdf"',
            'Content-Length' => (string) strlen($archivo['contenido']),
        ]);
    }

    public function create(): View
    {
        return view('admin.WEB04_EmpresaFormulario', ['empresa' => null] + $this->catalogos());
    }

    public function edit(int $id): View
    {
        return view('admin.WEB04_EmpresaFormulario', ['empresa' => $this->api->empresa($id)['empresa']] + $this->catalogos());
    }

    public function store(Request $request): RedirectResponse
    {
        try {
            $empresa = $this->api->crearEmpresa($this->validarEntrada($request));
        } catch (ApiError $error) {
            return $this->errorDeFormulario($error);
        }

        return redirect()->route('empresas.ver', $empresa['id'])->with('exito', "Se creó la empresa {$empresa['nombre_comercial']}. Quedó validada.");
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        try {
            $empresa = $this->api->editarEmpresa($id, $this->validarEntrada($request));
        } catch (ApiError $error) {
            return $this->errorDeFormulario($error);
        }

        return redirect()->route('empresas.ver', $empresa['id'])->with('exito', "Se guardaron los cambios de {$empresa['nombre_comercial']}.");
    }

    /** Validar o rechazar una empresa pendiente. */
    public function validacion(Request $request, int $id): RedirectResponse
    {
        $validador = Validator::make($request->all(), [
            'decision' => ['required', 'in:validada,rechazada'],
            'motivo' => ['required_if:decision,rechazada', 'nullable', 'string', 'max:255'],
        ], [
            'decision.required' => 'Elige validar o rechazar.',
            'decision.in' => 'Elige validar o rechazar.',
            'motivo.required_if' => 'Escribe el motivo del rechazo.',
            'motivo.max' => 'El motivo debe tener máximo 255 caracteres.',
        ]);
        if ($validador->fails()) {
            return $this->conModalAbierto(back()->withErrors($validador)->withInput(), $request);
        }
        $motivo = trim((string) $request->input('motivo'));

        try {
            $empresa = $this->api->validarEmpresa($id, $request->input('decision'), $motivo === '' ? null : $motivo);
        } catch (ApiError $error) {
            return $this->errorDeAccion($error, $request);
        }

        $accion = Empresas::acciones()[$empresa['estado'] === 'validada' ? 'validar' : 'rechazar'];

        return redirect()->route('empresas.ver', $id)->with('exito', str_replace(':nombre', $empresa['nombre_comercial'], $accion['exito']));
    }

    /** Suspender una empresa validada o reactivar una suspendida. */
    public function estado(Request $request, int $id): RedirectResponse
    {
        $validador = Validator::make($request->all(), [
            'estado' => ['required', 'in:suspendida,validada'],
            'motivo' => ['required_if:estado,suspendida', 'nullable', 'string', 'max:255'],
        ], [
            'estado.required' => 'Elige suspender o reactivar.',
            'estado.in' => 'Elige suspender o reactivar.',
            'motivo.required_if' => 'Escribe el motivo de la suspensión.',
            'motivo.max' => 'El motivo debe tener máximo 255 caracteres.',
        ]);
        if ($validador->fails()) {
            return $this->conModalAbierto(back()->withErrors($validador)->withInput(), $request);
        }
        $motivo = trim((string) $request->input('motivo'));

        try {
            $resultado = $this->api->cambiarEstadoEmpresa($id, $request->input('estado'), $motivo === '' ? null : $motivo);
        } catch (ApiError $error) {
            return $this->errorDeAccion($error, $request);
        }

        $nombre = $resultado['empresa']['nombre_comercial'];
        $aviso = $resultado['empresa']['estado'] === 'suspendida'
            ? "Se suspendió a {$nombre}: "
                .Empresas::plural($resultado['vacantes_suspendidas'], 'vacante suspendida', 'vacantes suspendidas').' y '
                .Empresas::plural($resultado['postulados_notificados'], 'persona postulada notificada', 'personas postuladas notificadas').'.'
            : "Se reactivó a {$nombre}. Sus vacantes siguen suspendidas hasta que las reactives una por una.";

        return redirect()->route('empresas.ver', $id)->with('exito', $aviso);
    }

    /**
     * @return array<string, mixed>
     */
    private function validarEntrada(Request $request): array
    {
        $request->merge(['rfc' => mb_strtoupper(trim((string) $request->input('rfc')))]);

        $datos = $request->validate([
            'razon_social' => ['required', 'string', 'max:200'],
            'nombre_comercial' => ['required', 'string', 'max:150'],
            'rfc' => ['required', 'regex:'.Empresas::RFC],
            'sector_id' => ['required', 'integer'],
            'tamano_empresa_id' => ['required', 'integer'],
            'municipio_id' => ['required', 'integer'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'sitio_web' => ['nullable', 'url', 'max:255'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'practicas_inclusion' => ['nullable', 'string', 'max:1000'],
        ], [
            'razon_social.required' => 'Escribe la razón social.',
            'razon_social.max' => 'La razón social debe tener máximo 200 caracteres.',
            'nombre_comercial.required' => 'Escribe el nombre comercial.',
            'nombre_comercial.max' => 'El nombre comercial debe tener máximo 150 caracteres.',
            'rfc.required' => 'Escribe el RFC.',
            'rfc.regex' => 'El RFC debe tener 3 o 4 letras, 6 dígitos de fecha y 3 caracteres de homoclave, sin espacios. Ejemplo: TQU150312AB1.',
            'sector_id.required' => 'Elige el sector.',
            'sector_id.integer' => 'Elige un sector de la lista.',
            'tamano_empresa_id.required' => 'Elige el tamaño de la empresa.',
            'tamano_empresa_id.integer' => 'Elige un tamaño de la lista.',
            'municipio_id.required' => 'Elige el municipio.',
            'municipio_id.integer' => 'Elige un municipio de la lista.',
            'direccion.max' => 'La dirección debe tener máximo 255 caracteres.',
            'sitio_web.url' => 'Escribe la dirección completa, por ejemplo https://empresa.mx.',
            'sitio_web.max' => 'El sitio web debe tener máximo 255 caracteres.',
            'descripcion.max' => 'La descripción debe tener máximo 1000 caracteres.',
            'practicas_inclusion.max' => 'Las prácticas de inclusión deben tener máximo 1000 caracteres.',
        ]);

        return [
            'razon_social' => trim($datos['razon_social']),
            'nombre_comercial' => trim($datos['nombre_comercial']),
            'rfc' => $datos['rfc'],
            'sector_id' => (int) $datos['sector_id'],
            'tamano_empresa_id' => (int) $datos['tamano_empresa_id'],
            'municipio_id' => (int) $datos['municipio_id'],
            'direccion' => $this->opcional($datos['direccion'] ?? null),
            'descripcion' => $this->opcional($datos['descripcion'] ?? null),
            'sitio_web' => $this->opcional($datos['sitio_web'] ?? null),
            'practicas_inclusion' => $this->opcional($datos['practicas_inclusion'] ?? null),
        ];
    }

    private function opcional(?string $texto): ?string
    {
        $texto = trim((string) $texto);

        return $texto === '' ? null : $texto;
    }

    /** Errores del API que el formulario muestra en su campo. */
    private function errorDeFormulario(ApiError $error): RedirectResponse
    {
        $campos = match ($error->codigo) {
            'rfc_duplicado' => ['rfc' => 'Otra empresa ya registró ese RFC. Revisa que esté bien escrito.'],
            'validacion' => $error->campos ?: ['razon_social' => $error->detail],
            default => throw $error,
        };

        return back()->withErrors($campos)->withInput();
    }

    /** Errores del API al validar, rechazar, suspender o reactivar. */
    private function errorDeAccion(ApiError $error, Request $request): RedirectResponse
    {
        return match ($error->codigo) {
            // La empresa ya no está en el estado que pide la acción (otra persona la atendió).
            'estado_invalido', 'transicion_invalida' => back()->with('error', $error->detail),
            'validacion' => $this->conModalAbierto(back()->withErrors($error->campos ?: ['motivo' => $error->detail])->withInput(), $request),
            default => throw $error,
        };
    }

    /** Vuelve a abrir la confirmación que se envió, para que el error se vea donde se escribió el motivo. */
    private function conModalAbierto(RedirectResponse $respuesta, Request $request): RedirectResponse
    {
        return $respuesta->with('abrir_modal', (string) $request->input('modal'));
    }

    /**
     * Listas del formulario (GET /catalogos/sectores, tamanos-empresa, entidades y municipios).
     *
     * @return array{sectores: array<int, string>, tamanos: array<int, string>, municipios: array<int, string>}
     */
    private function catalogos(): array
    {
        $entidades = array_column($this->api->catalogo('entidades'), 'nombre', 'id');
        $municipios = [];
        foreach ($this->api->catalogo('municipios') as $municipio) {
            $municipios[$municipio['id']] = $municipio['nombre'].', '.($entidades[$municipio['entidad_federativa_id']] ?? '');
        }

        return [
            'sectores' => array_column($this->api->catalogo('sectores'), 'nombre', 'id'),
            'tamanos' => array_column(array_map(fn (array $t) => ['id' => $t['id'], 'nombre' => $t['nombre'].' · '.$t['rango']], $this->api->catalogo('tamanos-empresa')), 'nombre', 'id'),
            'municipios' => $municipios,
        ];
    }
}

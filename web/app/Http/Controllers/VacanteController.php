<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use App\Support\AccionesVacante;
use App\Support\Estados;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/** WEB-05 · Moderación de vacantes (GET /admin/vacantes, GET /vacantes/{id}, PATCH /admin/vacantes/{id}/estado). */
class VacanteController extends Controller
{
    private const TAMANO_PAGINA = 25;

    public function __construct(private readonly ApiAdmin $api) {}

    public function index(Request $request): View
    {
        $texto = $request->query('q');
        $estado = $request->query('estado');
        $empresas = $this->opciones(array_column($this->api->listarEmpresas(size: 100)['items'], 'nombre_comercial', 'id'));
        $categorias = array_column($this->api->catalogo('categorias'), 'nombre', 'id');
        $modalidades = array_column($this->api->catalogo('modalidades'), 'nombre', 'id');

        $pagina = $this->api->vacantes(
            is_string($texto) && trim($texto) !== '' ? mb_substr(trim($texto), 0, 100) : null,
            $this->idDe($request, 'empresa_id', $empresas),
            is_string($estado) && Estados::existe('vacante', $estado) ? $estado : null,
            $this->idDe($request, 'categoria_id', $categorias),
            $this->idDe($request, 'modalidad_id', $modalidades),
            $request->boolean('con_reportes'),
            max(1, (int) $request->query('page', 1)),
            self::TAMANO_PAGINA,
        );

        return view('admin.WEB05_Vacantes', [
            'pagina' => $pagina,
            'opcionesEmpresa' => $empresas,
            'opcionesCategoria' => $categorias,
            'opcionesModalidad' => $modalidades,
            'opcionesEstado' => array_combine(Estados::valores('vacante'), array_map(fn (string $valor) => Estados::de('vacante', $valor)['texto'], Estados::valores('vacante'))),
        ]);
    }

    public function show(int $id): View
    {
        return view('admin.WEB05_VacanteDetalle', ['vacante' => $this->api->vacante($id)]);
    }

    /** Suspender (con motivo) o reactivar. */
    public function estado(Request $request, int $id): RedirectResponse
    {
        $validador = Validator::make($request->all(), [
            'estado' => ['required', 'in:suspendida,publicada'],
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
            $vacante = $this->api->moderarVacante($id, $request->input('estado'), $motivo === '' ? null : $motivo);
        } catch (ApiError $error) {
            return match ($error->codigo) {
                // La vacante ya no está en el estado que pide la acción (por ejemplo, otra persona la suspendió).
                'transicion_invalida' => back()->with('error', $error->detail),
                'validacion' => $this->conModalAbierto(back()->withErrors($error->campos ?: ['motivo' => $error->detail])->withInput(), $request),
                default => throw $error,
            };
        }

        $accion = AccionesVacante::todas()[$vacante['estado'] === 'suspendida' ? 'suspender' : 'reactivar'];

        return redirect()->route('vacantes.ver', $id)->with('exito', str_replace(':titulo', $vacante['titulo'], $accion['exito']));
    }

    /**
     * Opciones de un selector, de id a texto.
     *
     * @param  array<int, string>  $opciones
     * @return array<int, string>
     */
    private function opciones(array $opciones): array
    {
        asort($opciones, SORT_NATURAL | SORT_FLAG_CASE);

        return $opciones;
    }

    /**
     * Id de un filtro si existe en la lista del selector; si no, se ignora.
     *
     * @param  array<int, string>  $opciones
     */
    private function idDe(Request $request, string $campo, array $opciones): ?int
    {
        $valor = $request->query($campo);

        return is_string($valor) && ctype_digit($valor) && isset($opciones[(int) $valor]) ? (int) $valor : null;
    }

    /** Vuelve a abrir la confirmación que se envió, para que el error se vea donde se escribió el motivo. */
    private function conModalAbierto(RedirectResponse $respuesta, Request $request): RedirectResponse
    {
        return $respuesta->with('abrir_modal', (string) $request->input('modal'));
    }
}

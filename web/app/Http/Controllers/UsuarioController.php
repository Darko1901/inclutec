<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use App\Support\AccionesUsuario;
use App\Support\Estados;
use App\Support\Roles;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/** WEB-03 · Gestión de usuarios (GET, POST y PUT /admin/usuarios, PATCH /admin/usuarios/{id}/estado). */
class UsuarioController extends Controller
{
    private const TAMANO_PAGINA = 25;

    public function __construct(private readonly ApiAdmin $api) {}

    public function index(Request $request): View
    {
        $texto = $request->query('q');
        $rol = $request->query('rol');
        $estado = $request->query('estado');
        $filtros = [
            'q' => is_string($texto) ? mb_substr(trim($texto), 0, 100) : '',
            'rol' => is_string($rol) && isset(Roles::TEXTOS[$rol]) ? $rol : null,
            'estado' => is_string($estado) && Estados::existe('usuario', $estado) ? $estado : null,
        ];
        $page = max(1, (int) $request->query('page', 1));

        return view('admin.WEB03_Usuarios', [
            'pagina' => $this->api->usuarios($filtros['q'] ?: null, $filtros['rol'], $filtros['estado'], $page, self::TAMANO_PAGINA),
            'opcionesRol' => Roles::TEXTOS,
            'opcionesEstado' => array_map(fn (string $valor) => Estados::de('usuario', $valor)['texto'], array_combine(Estados::valores('usuario'), Estados::valores('usuario'))),
        ]);
    }

    public function show(int $id): View
    {
        return view('admin.WEB03_UsuarioDetalle', ['detalle' => $this->api->usuario($id)]);
    }

    public function create(): View
    {
        return view('admin.WEB03_UsuarioFormulario', ['usuario' => null, 'puesto' => null] + $this->opcionesFormulario());
    }

    public function edit(int $id): View
    {
        $detalle = $this->api->usuario($id);

        return view('admin.WEB03_UsuarioFormulario', ['usuario' => $detalle['usuario'], 'puesto' => $detalle['puesto']] + $this->opcionesFormulario());
    }

    public function store(Request $request): RedirectResponse
    {
        $datos = $this->validarEntrada($request, true);

        try {
            $usuario = $this->api->crearUsuario($datos);
        } catch (ApiError $error) {
            return $this->errorDeFormulario($error);
        }

        return redirect()->route('usuarios.ver', $usuario['id'])->with('exito', "Se creó a {$this->nombre($usuario)}.");
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $datos = $this->validarEntrada($request, false);

        try {
            $usuario = $this->api->editarUsuario($id, $datos);
        } catch (ApiError $error) {
            return $this->errorDeFormulario($error);
        }

        return redirect()->route('usuarios.ver', $usuario['id'])->with('exito', "Se guardaron los cambios de {$this->nombre($usuario)}.");
    }

    public function estado(Request $request, int $id): RedirectResponse
    {
        $validador = Validator::make($request->all(), [
            'estado' => ['required', 'in:'.implode(',', Estados::valores('usuario'))],
            'motivo' => ['nullable', 'string', 'max:255'],
        ], [
            'estado.required' => 'Elige qué quieres hacer con la cuenta.',
            'estado.in' => 'Elige qué quieres hacer con la cuenta.',
            'motivo.max' => 'El motivo debe tener máximo 255 caracteres.',
        ]);
        if ($validador->fails()) {
            return $this->conModalAbierto(back()->withErrors($validador)->withInput(), $request);
        }
        $motivo = trim((string) $request->input('motivo'));

        try {
            $usuario = $this->api->cambiarEstadoUsuario($id, $request->input('estado'), $motivo === '' ? null : $motivo);
        } catch (ApiError $error) {
            return match ($error->codigo) {
                // Un administrador no puede suspenderse a sí mismo.
                'estado_invalido' => back()->with('error', $error->detail),
                'validacion' => $this->conModalAbierto(back()->withErrors($error->campos ?: ['motivo' => $error->detail])->withInput(), $request),
                default => throw $error,
            };
        }

        $accion = AccionesUsuario::todas()[AccionesUsuario::paraEstado($usuario['estado'])];

        return redirect()->back(fallback: route('usuarios'))->with('exito', str_replace(':nombre', $this->nombre($usuario), $accion['exito']));
    }

    /**
     * Valida el formulario con los mismos límites del contrato (UsuarioAdminEntrada). Si el rol no es
     * reclutador, la empresa y el puesto no viajan.
     *
     * @return array<string, mixed>
     */
    private function validarEntrada(Request $request, bool $alCrear): array
    {
        $datos = $request->validate([
            'rol' => ['required', 'in:'.implode(',', array_keys(Roles::TEXTOS))],
            'nombre' => ['required', 'string', 'max:80'],
            'apellidos' => ['required', 'string', 'max:120'],
            'correo' => ['required', 'email', 'max:254'],
            'telefono' => ['nullable', 'regex:/^[0-9]{10}$/'],
            'contrasena' => [$alCrear ? 'required' : 'nullable', 'string', 'min:8', 'max:64'],
            'empresa_id' => ['required_if:rol,reclutador', 'nullable', 'integer'],
            'puesto' => ['required_if:rol,reclutador', 'nullable', 'string', 'max:100'],
        ], [
            'rol.required' => 'Elige el rol del usuario.',
            'rol.in' => 'Elige candidato, reclutador o administrador.',
            'nombre.required' => 'Escribe el nombre.',
            'nombre.max' => 'El nombre debe tener máximo 80 caracteres.',
            'apellidos.required' => 'Escribe los apellidos.',
            'apellidos.max' => 'Los apellidos deben tener máximo 120 caracteres.',
            'correo.required' => 'Escribe el correo.',
            'correo.email' => 'Escribe un correo válido, por ejemplo nombre@empresa.mx.',
            'correo.max' => 'El correo debe tener máximo 254 caracteres.',
            'telefono.regex' => 'El teléfono debe tener 10 dígitos, sin espacios ni guiones.',
            'contrasena.required' => 'Escribe una contraseña para la cuenta.',
            'contrasena.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'contrasena.max' => 'La contraseña debe tener máximo 64 caracteres.',
            'empresa_id.required_if' => 'Elige la empresa del reclutador.',
            'empresa_id.integer' => 'Elige una empresa de la lista.',
            'puesto.required_if' => 'Escribe el puesto del reclutador.',
            'puesto.max' => 'El puesto debe tener máximo 100 caracteres.',
        ]);

        $esReclutador = $datos['rol'] === 'reclutador';
        $entrada = [
            'rol' => $datos['rol'],
            'nombre' => trim($datos['nombre']),
            'apellidos' => trim($datos['apellidos']),
            'correo' => trim($datos['correo']),
            'telefono' => $datos['telefono'] ?? null,
            'empresa_id' => $esReclutador ? (int) $datos['empresa_id'] : null,
            'puesto' => $esReclutador ? trim($datos['puesto']) : null,
        ];

        return $alCrear ? $entrada + ['contrasena' => $datos['contrasena']] : $entrada;
    }

    /** Errores del API que el formulario muestra en su campo. */
    private function errorDeFormulario(ApiError $error): RedirectResponse
    {
        $campos = match ($error->codigo) {
            'correo_duplicado' => ['correo' => 'Ya existe un usuario con ese correo. Usa otro.'],
            // No se puede cambiar el rol de quien ya tiene postulaciones o vacantes.
            'en_uso' => ['rol' => 'No se puede cambiar el rol: esta persona ya tiene postulaciones o vacantes.'],
            'validacion' => $error->campos ?: ['correo' => $error->detail],
            default => throw $error,
        };

        return back()->withErrors($campos)->withInput();
    }

    /** Vuelve a abrir la confirmación que se envió, para que el error se vea donde se escribió el motivo. */
    private function conModalAbierto(RedirectResponse $respuesta, Request $request): RedirectResponse
    {
        return $respuesta->with('abrir_modal', (string) $request->input('modal'));
    }

    /**
     * Empresas para el selector de reclutador (GET /admin/empresas).
     *
     * @return array{empresas: array<int, string>}
     */
    private function opcionesFormulario(): array
    {
        $empresas = [];
        foreach ($this->api->listarEmpresas(1, 100)['items'] as $empresa) {
            $empresas[$empresa['id']] = $empresa['nombre_comercial'].' · '.Estados::de('empresa', $empresa['estado'])['texto'];
        }

        return ['empresas' => $empresas, 'roles' => Roles::TEXTOS];
    }

    /** @param  array<string, mixed>  $usuario */
    private function nombre(array $usuario): string
    {
        return trim($usuario['nombre'].' '.$usuario['apellidos']);
    }
}

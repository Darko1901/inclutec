<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use App\Support\Catalogos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Alta, edición, activar o desactivar y eliminar de los registros de WEB-06 y WEB-07. Una sola
 * implementación para los diez catálogos: cada uno se llama con su `clave` (categorias, habilidades o
 * el tipo de /admin/catalogos/{tipo}) y se dirige al método del API que le toca.
 */
class ElementoCatalogoController extends Controller
{
    public function __construct(private readonly ApiAdmin $api) {}

    public function store(Request $request, string $clave): RedirectResponse
    {
        $datos = $this->validar($request, $clave);

        try {
            $registro = match ($clave) {
                'categorias' => $this->api->crearCategoria($datos),
                'habilidades' => $this->api->crearHabilidad($datos),
                default => $this->api->crearElementoCatalogo($clave, $datos),
            };
        } catch (ApiError $error) {
            return $this->errorDeFormulario($error, $clave);
        }

        return $this->volver($clave)->with('exito', "Se agregó «{$registro['nombre']}».");
    }

    public function update(Request $request, string $clave, int $id): RedirectResponse
    {
        $datos = $this->validar($request, $clave);

        try {
            $registro = match ($clave) {
                'categorias' => $this->api->editarCategoria($id, $datos),
                'habilidades' => $this->api->editarHabilidad($id, $datos),
                default => $this->api->editarElementoCatalogo($clave, $id, $datos),
            };
        } catch (ApiError $error) {
            return $this->errorDeFormulario($error, $clave);
        }

        return $this->volver($clave)->with('exito', "Se guardaron los cambios de «{$registro['nombre']}».");
    }

    /** Activar o desactivar: desactivar siempre se puede y deja de ofrecerse en registros nuevos. */
    public function activar(Request $request, string $clave, int $id): RedirectResponse
    {
        $activo = $request->boolean('activo');

        $registro = match ($clave) {
            'categorias' => $this->api->activarCategoria($id, $activo),
            'habilidades' => $this->api->activarHabilidad($id, $activo),
            default => $this->api->activarElementoCatalogo($clave, $id, $activo),
        };

        return $this->volver($clave)->with('exito', $activo
            ? "Se activó «{$registro['nombre']}»."
            : "Se desactivó «{$registro['nombre']}». Ya no se ofrece en registros nuevos; lo que ya se guardó no cambia.");
    }

    public function destroy(Request $request, string $clave, int $id): RedirectResponse
    {
        $nombre = trim((string) $request->input('nombre'));

        try {
            match ($clave) {
                'categorias' => $this->api->eliminarCategoria($id),
                'habilidades' => $this->api->eliminarHabilidad($id),
                default => $this->api->eliminarElementoCatalogo($clave, $id),
            };
        } catch (ApiError $error) {
            // Está en uso: no se borra, y la pantalla ofrece desactivarlo.
            if ($error->codigo === 'en_uso') {
                return $this->volver($clave)->with('en_uso', ['clave' => $clave, 'id' => $id, 'nombre' => $nombre]);
            }
            throw $error;
        }

        return $this->volver($clave)->with('exito', $nombre === '' ? 'Se eliminó el registro.' : "Se eliminó «{$nombre}».");
    }

    /**
     * Valida el formulario con los límites del contrato y arma el cuerpo para el API.
     *
     * @return array<string, mixed>
     */
    private function validar(Request $request, string $clave): array
    {
        $datos = $request->validate(Catalogos::reglas($clave), Catalogos::mensajes($clave));

        $cuerpo = [];
        foreach (Catalogos::definicion($clave)['campos'] as $campo) {
            $valor = $datos[$campo['nombre']] ?? null;
            $cuerpo[$campo['nombre']] = match (true) {
                in_array($campo['tipo'], ['number'], true) || $campo['nombre'] === 'categoria_id' => $valor === null ? null : (int) $valor,
                default => $valor === null || trim((string) $valor) === '' ? null : trim((string) $valor),
            };
        }

        return $cuerpo;
    }

    /** Errores del API que el formulario muestra en su campo, y la ventana que se envió se vuelve a abrir. */
    private function errorDeFormulario(ApiError $error, string $clave): RedirectResponse
    {
        $campos = match ($error->codigo) {
            'nombre_duplicado' => ['nombre' => Catalogos::definicion($clave)['duplicado']],
            'validacion' => $error->campos ?: ['nombre' => $error->detail],
            default => throw $error,
        };

        return back()->withErrors($campos)->withInput()->with('abrir_modal', (string) request()->input('modal'));
    }

    /** De vuelta a la pantalla de origen (con su pestaña, búsqueda y página) o a la del catálogo. */
    private function volver(string $clave): RedirectResponse
    {
        return redirect()->back(fallback: isset(Catalogos::SECCIONES[$clave])
            ? route('habilidades', ['seccion' => $clave])
            : route('catalogos', ['tipo' => $clave]));
    }
}

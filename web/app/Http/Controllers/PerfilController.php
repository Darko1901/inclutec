<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** «Cambiar contraseña» (PUT /auth/password). La ruta sigue siendo /perfil. */
class PerfilController extends Controller
{
    public function __construct(private readonly ApiAdmin $api) {}

    public function index(): View
    {
        return view('admin.WEB09_Perfil');
    }

    public function actualizar(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'contrasena_actual' => ['required', 'string', 'max:64'],
            // Política del contrato: de 8 a 64 caracteres, con al menos una letra y un número.
            'contrasena_nueva' => ['required', 'string', 'min:8', 'max:64', 'regex:/\pL/u', 'regex:/\pN/u', 'confirmed'],
            'contrasena_nueva_confirmation' => ['required'],
        ], [
            'contrasena_actual.required' => 'Escribe tu contraseña actual.',
            'contrasena_nueva.required' => 'Escribe la contraseña nueva.',
            'contrasena_nueva.min' => 'La contraseña nueva debe tener al menos 8 caracteres.',
            'contrasena_nueva.max' => 'La contraseña nueva debe tener máximo 64 caracteres.',
            'contrasena_nueva.regex' => 'La contraseña nueva debe tener al menos una letra y un número.',
            'contrasena_nueva.confirmed' => 'La confirmación no coincide con la contraseña nueva.',
            'contrasena_nueva_confirmation.required' => 'Confirma la contraseña nueva.',
        ]);

        try {
            $this->api->cambiarContrasena($datos['contrasena_actual'], $datos['contrasena_nueva']);
        } catch (ApiError $error) {
            return match ($error->codigo) {
                'contrasena_incorrecta' => back()->withErrors(['contrasena_actual' => 'La contraseña actual no es correcta. Revísala e inténtalo de nuevo.']),
                'validacion' => back()->withErrors($error->campos ?: ['contrasena_nueva' => $error->detail]),
                'error_interno' => back()->with('error', ApiError::MENSAJE_INTERNO.'.'),
                default => throw $error,
            };
        }

        return redirect()->route('perfil')->with('exito', 'Tu contraseña se actualizó.');
    }
}

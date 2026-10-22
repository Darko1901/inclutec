<?php

namespace App\Support;

/** Roles de usuario (valor de BD → texto en pantalla). */
class Roles
{
    public const TEXTOS = [
        'candidato' => 'Candidato',
        'reclutador' => 'Reclutador',
        'administrador' => 'Administrador',
    ];

    public static function texto(string $rol): string
    {
        return self::TEXTOS[$rol] ?? ucfirst($rol);
    }
}

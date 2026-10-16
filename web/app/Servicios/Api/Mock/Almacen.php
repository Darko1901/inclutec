<?php

namespace App\Servicios\Api\Mock;

/**
 * Estado persistente de ApiMock: un archivo JSON (storage/app/mock-api.json, fuera de git) que se
 * crea con los datos de Mock/datos.php la primera vez. Así lo que el administrador cambia en el
 * panel (contraseñas, estados, altas…) se conserva entre peticiones. `php artisan
 * inclutec:mock-reiniciar` lo borra para volver a los datos iniciales.
 */
class Almacen
{
    public static function ruta(): string
    {
        return config('inclutec.mock_archivo');
    }

    /** Datos iniciales: los de S002 más el estado interno del mock. @return array<string, mixed> */
    public static function inicial(): array
    {
        return (require __DIR__.'/datos.php') + ['intentos_login' => []];
    }

    /**
     * Lee el estado actual (sin modificarlo).
     *
     * @return array<string, mixed>
     */
    public static function leer(): array
    {
        return self::modificar(fn (array &$estado) => $estado);
    }

    /**
     * Ejecuta `$cambio(array &$estado)` con el archivo bloqueado y guarda el estado resultante.
     * Devuelve lo que devuelva `$cambio`. Si falta alguna llave nueva de datos.php, se completa.
     *
     * @template T
     *
     * @param  callable(array<string, mixed>&): T  $cambio
     * @return T
     */
    public static function modificar(callable $cambio): mixed
    {
        $ruta = self::ruta();
        if (! is_dir(dirname($ruta))) {
            mkdir(dirname($ruta), 0775, true);
        }

        $archivo = fopen($ruta, 'c+');
        flock($archivo, LOCK_EX);

        try {
            $guardado = json_decode((string) stream_get_contents($archivo), true);
            $estado = (is_array($guardado) ? $guardado : []) + self::inicial();

            $resultado = $cambio($estado);

            ftruncate($archivo, 0);
            rewind($archivo);
            fwrite($archivo, json_encode($estado, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            fflush($archivo);

            return $resultado;
        } finally {
            flock($archivo, LOCK_UN);
            fclose($archivo);
        }
    }

    /** Borra el estado guardado; la siguiente lectura parte de los datos iniciales. */
    public static function reiniciar(): void
    {
        if (is_file(self::ruta())) {
            unlink(self::ruta());
        }
    }
}

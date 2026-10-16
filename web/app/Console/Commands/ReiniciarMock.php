<?php

namespace App\Console\Commands;

use App\Servicios\Api\Mock\Almacen;
use Illuminate\Console\Command;

class ReiniciarMock extends Command
{
    protected $signature = 'inclutec:mock-reiniciar';

    protected $description = 'Vuelve el API simulado (INCLUTEC_API_MOCK=true) a los datos iniciales de la semilla S002';

    public function handle(): int
    {
        Almacen::reiniciar();
        Almacen::leer();

        $this->info('Datos del API simulado reiniciados: '.Almacen::ruta());

        return self::SUCCESS;
    }
}

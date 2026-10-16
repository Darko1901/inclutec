<?php

return [

    /*
    | Dirección base del API REST (incluye /api/v1).
    */

    'api_url' => env('INCLUTEC_API_URL', 'http://localhost:8000/api/v1'),

    /*
    | Si es true, el panel usa ApiMock (datos de prueba) en lugar de llamar al API.
    */

    'mock' => filter_var(env('INCLUTEC_API_MOCK', true), FILTER_VALIDATE_BOOLEAN),

    /*
    | Archivo donde ApiMock guarda su estado para que los cambios sobrevivan entre peticiones.
    | Está fuera de git (storage/app). `php artisan inclutec:mock-reiniciar` lo borra.
    */

    'mock_archivo' => storage_path('app/mock-api.json'),

];

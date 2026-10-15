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

];

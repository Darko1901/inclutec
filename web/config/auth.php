<?php

// El panel no usa el sistema de usuarios de Laravel: la identidad la da el API y el
// token vive en la sesión del servidor (ver App\Http\Middleware\ExigirAdministrador).
return [

    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [],

    'providers' => [],

    'passwords' => [],

];

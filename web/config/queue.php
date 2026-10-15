<?php

return [

    /*
    | Sin colas reales: el panel no usa trabajos en segundo plano (todo corre en `sync`).
    */

    'default' => env('QUEUE_CONNECTION', 'sync'),

    'connections' => [

        'sync' => [
            'driver' => 'sync',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

    'failed' => [
        'driver' => 'null',
    ],

];

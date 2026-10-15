<?php

namespace App\Providers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use Illuminate\Support\ServiceProvider;

class ApiServiceProvider extends ServiceProvider
{
    /** Elige la implementación del API según INCLUTEC_API_MOCK (config inclutec.mock). */
    public function register(): void
    {
        $this->app->bind(ApiAdmin::class, fn () => config('inclutec.mock') ? new ApiMock : new ApiHttp);
    }
}

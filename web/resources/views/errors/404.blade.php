@php
    // Con sesión del panel se ve con su menú; una dirección que no existe llega sin sesión y usa la página sencilla.
    $conSesion = request()->hasSession() && request()->session()->has(\App\Servicios\Api\ApiHttp::SESION_TOKEN);
@endphp
@extends($conSesion ? 'layouts.admin_layout' : 'layouts.publico')
@section('titulo', 'Página no encontrada')
@section('content')
<div class="card pagina-error">
    <img src="{{ asset('img/icon.png') }}" alt="" class="pagina-error-logo" width="64" height="64">
    <p class="pagina-error-codigo" aria-hidden="true">404</p>
    <h1>Página no encontrada</h1>
    <p>{{ $mensaje ?? 'La página que buscas no existe o cambió de lugar. Revisa la dirección o regresa al inicio.' }}</p>
    <a href="{{ route($conSesion ? 'dashboard' : 'login') }}" class="btn btn-primary">{{ $conSesion ? 'Volver al panel' : 'Ir al inicio de sesión' }}</a>
</div>
@endsection

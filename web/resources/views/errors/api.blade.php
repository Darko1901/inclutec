@extends('layouts.admin_layout')
@section('titulo', $titulo ?? 'No se pudo completar la acción')
@section('content')
<div class="card pagina-error" role="alert">
    <h1>{{ $titulo ?? 'No se pudo completar la acción' }}</h1>
    <p>{{ $mensaje }}</p>
    <div class="pagina-error-acciones">
        @if (! empty($reintentar))
            <a href="{{ $reintentar }}" class="btn btn-primary">Reintentar</a>
        @endif
        <a href="{{ route('dashboard') }}" class="btn {{ empty($reintentar) ? 'btn-primary' : 'btn-outline' }}">Volver al inicio</a>
    </div>
</div>
@endsection

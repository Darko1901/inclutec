@extends('layouts.admin_layout')
@section('content')
<div class="card" role="alert">
    <h1 style="font-size:1.5rem; margin-bottom:0.75rem;">No se pudo completar la acción</h1>
    <p style="margin-bottom:1.5rem;">{{ $mensaje }}</p>
    <a href="{{ route('dashboard') }}" class="btn btn-primary">Volver al inicio</a>
</div>
@endsection

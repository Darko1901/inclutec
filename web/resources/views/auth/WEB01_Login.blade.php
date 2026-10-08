@extends('layouts.auth')

@section('content')
<div class="auth-wrapper">
    <div class="auth-card">
        <h1>IncluTec Admin</h1>
        <form action="/dashboard" method="GET">
            <div class="form-group">
                <label class="form-label" for="email">Correo Electrónico</label>
                <input type="email" id="email" class="form-control" placeholder="admin@inclutec.com" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="password">Contraseña</label>
                <input type="password" id="password" class="form-control" placeholder="••••••••" required>
            </div>
            <div style="text-align: right; margin-bottom: 1.5rem;">
                <a href="#">¿Olvidaste tu contraseña?</a>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Iniciar Sesión</button>
        </form>
    </div>
</div>
@endsection

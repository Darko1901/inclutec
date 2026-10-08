@extends('layouts.admin_layout')
@section('content')
<div style="margin-bottom:2rem;">
    <h1>Mi Perfil</h1>
    <p style="color: #6B7280;">Administra tus datos personales y credenciales de acceso maestro.</p>
</div>

<div class="dashboard-grid">
    <div class="card" style="border-top: 4px solid var(--primary);">
        <h2 style="font-size:1.2rem; margin-bottom: 1.5rem;">Información Básica</h2>
        <div class="form-group">
            <label class="form-label">Nombre Completo</label>
            <input type="text" class="form-control" value="Admin General" readonly>
        </div>
        <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" class="form-control" value="admin@inclutec.com" readonly>
        </div>
        <button class="btn btn-outline">Solicitar Cambio de Datos</button>
    </div>

    <div class="card" style="border-top: 4px solid var(--danger);">
        <h2 style="font-size:1.2rem; margin-bottom: 1.5rem;">Seguridad</h2>
        <div class="form-group">
            <label class="form-label">Contraseña Actual</label>
            <input type="password" class="form-control" placeholder="••••••••">
        </div>
        <div class="form-group">
            <label class="form-label">Nueva Contraseña</label>
            <input type="password" class="form-control" placeholder="Mínimo 8 caracteres">
        </div>
        <button class="btn btn-primary">Actualizar Contraseña</button>
    </div>
</div>
@endsection

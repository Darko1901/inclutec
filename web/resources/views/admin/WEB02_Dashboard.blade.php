@extends('layouts.admin_layout')
@section('content')
<h1>Dashboard y Estadísticas</h1>
<div class="dashboard-grid">
    <div class="stat-card" aria-label="Total de usuarios">
        <h3>Total Usuarios</h3>
        <div class="value">1,245</div>
    </div>
    <div class="stat-card" aria-label="Vacantes Activas">
        <h3>Vacantes Activas</h3>
        <div class="value">342</div>
    </div>
    <div class="stat-card" aria-label="Empresas Registradas">
        <h3>Empresas</h3>
        <div class="value">89</div>
    </div>
    <div class="stat-card" aria-label="Reportes Pendientes">
        <h3>Reportes Pendientes</h3>
        <div class="value" style="color: var(--danger);">12</div>
    </div>
</div>
<h2>Actividad Reciente</h2>
<div class="table-wrapper">
    <table aria-label="Tabla de actividad reciente">
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Usuario</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>08/10/2026</td><td>Nueva empresa registrada</td><td>TechCorp SA</td></tr>
            <tr><td>08/10/2026</td><td>Vacante publicada</td><td>Desarrollador Web</td></tr>
            <tr><td>07/10/2026</td><td>Reporte generado</td><td>Usuario ID: 452</td></tr>
        </tbody>
    </table>
</div>
@endsection

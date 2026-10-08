@extends('layouts.admin_layout')
@section('content')
<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:2rem;">
    <div>
        <h1>Dashboard General</h1>
        <p style="color: #6B7280; font-weight:500;">Resumen del estado actual de la plataforma IncluTec.</p>
    </div>
    <button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Datos actualizados correctamente', type: 'success'})">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;"><path stroke-linecap="square" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        Actualizar Datos
    </button>
</div>

<div class="dashboard-grid">
    <div class="stat-card" style="border-left-color: var(--primary);">
        <h3>Total Usuarios</h3>
        <div class="value">1,245</div>
        <div style="color:var(--success); font-size:0.85rem; font-weight:600; margin-top:0.5rem;">↑ 12% este mes</div>
    </div>
    <div class="stat-card" style="border-left-color: #8B5CF6;">
        <h3>Vacantes Activas</h3>
        <div class="value">342</div>
        <div style="color:var(--success); font-size:0.85rem; font-weight:600; margin-top:0.5rem;">↑ 5% este mes</div>
    </div>
    <div class="stat-card" style="border-left-color: var(--success);">
        <h3>Empresas Validadas</h3>
        <div class="value">89</div>
        <div style="color:#6B7280; font-size:0.85rem; font-weight:600; margin-top:0.5rem;">4 pendientes de revisión</div>
    </div>
    <div class="stat-card" style="border-left-color: var(--danger);">
        <h3>Reportes Activos</h3>
        <div class="value" style="color: var(--danger);">12</div>
        <div style="color:var(--danger); font-size:0.85rem; font-weight:600; margin-top:0.5rem;">Requieren atención</div>
    </div>
</div>

<div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
    <div class="card">
        <h2 style="font-size:1.1rem; margin-bottom:1.5rem;">Actividad Reciente</h2>
        <table style="margin-top:-1rem;">
            <tbody>
                <tr>
                    <td style="border-bottom: 1px solid #E5E7EB; padding: 1rem 0;">
                        <div style="font-weight:700;">Nueva empresa registrada</div>
                        <div style="font-size:0.85rem; color:#6B7280;">InnovaTech Soluciones S.A. de C.V.</div>
                    </td>
                    <td style="text-align:right; border-bottom: 1px solid #E5E7EB; color:#6B7280; font-size:0.85rem;">Hace 2 horas</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #E5E7EB; padding: 1rem 0;">
                        <div style="font-weight:700;">Vacante publicada</div>
                        <div style="font-size:0.85rem; color:#6B7280;">Desarrollador Frontend Accesible - Microsoft</div>
                    </td>
                    <td style="text-align:right; border-bottom: 1px solid #E5E7EB; color:#6B7280; font-size:0.85rem;">Hace 5 horas</td>
                </tr>
                <tr>
                    <td style="border-bottom: none; padding: 1rem 0;">
                        <div style="font-weight:700;">Reporte de usuario generado</div>
                        <div style="font-size:0.85rem; color:#6B7280;">ID: #TCK-991 - Problemas con lector de pantalla</div>
                    </td>
                    <td style="text-align:right; border-bottom: none; color:#6B7280; font-size:0.85rem;">Hace 1 día</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2 style="font-size:1.1rem; margin-bottom:1.5rem;">Distribución de Discapacidades</h2>
        
        <div style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Visual</span> <span>45%</span>
            </div>
            <div style="width:100%; height:8px; background:#E5E7EB; border-radius:4px; overflow:hidden;">
                <div style="width:45%; height:100%; background:var(--primary);"></div>
            </div>
        </div>
        
        <div style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Auditiva</span> <span>30%</span>
            </div>
            <div style="width:100%; height:8px; background:#E5E7EB; border-radius:4px; overflow:hidden;">
                <div style="width:30%; height:100%; background:#8B5CF6;"></div>
            </div>
        </div>
        
        <div style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Motriz</span> <span>25%</span>
            </div>
            <div style="width:100%; height:8px; background:#E5E7EB; border-radius:4px; overflow:hidden;">
                <div style="width:25%; height:100%; background:var(--success);"></div>
            </div>
        </div>
    </div>
</div>
@endsection

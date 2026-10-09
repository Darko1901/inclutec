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
        <h3 style="display:flex; align-items:center; gap:0.5rem;">
            <svg style="width:20px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            Total Usuarios
        </h3>
        <div class="value">1,245</div>
        <div style="color:var(--success); font-size:0.85rem; font-weight:600; margin-top:0.5rem; display:flex; align-items:center; gap:0.25rem;">
            <svg style="width:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>Tendencia al alza: 12% este mes</span>
        </div>
    </div>
    <div class="stat-card" style="border-left-color: #8B5CF6;">
        <h3 style="display:flex; align-items:center; gap:0.5rem;">
            <svg style="width:20px; color:#8B5CF6;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Vacantes Activas
        </h3>
        <div class="value">342</div>
        <div style="color:var(--success); font-size:0.85rem; font-weight:600; margin-top:0.5rem; display:flex; align-items:center; gap:0.25rem;">
            <svg style="width:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <span>Tendencia al alza: 5% este mes</span>
        </div>
    </div>
    <div class="stat-card" style="border-left-color: var(--success);">
        <h3 style="display:flex; align-items:center; gap:0.5rem;">
            <svg style="width:20px; color:var(--success);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Empresas Validadas
        </h3>
        <div class="value">89</div>
        <div style="color:#6B7280; font-size:0.85rem; font-weight:600; margin-top:0.5rem; display:flex; align-items:center; gap:0.25rem;">
            <svg style="width:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>4 pendientes de revisión</span>
        </div>
    </div>
    <div class="stat-card" style="border-left-color: var(--danger);">
        <h3 style="display:flex; align-items:center; gap:0.5rem;">
            <svg style="width:20px; color:var(--danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Reportes Activos
        </h3>
        <div class="value" style="color: var(--danger);">12</div>
        <div style="color:var(--danger); font-size:0.85rem; font-weight:600; margin-top:0.5rem; display:flex; align-items:center; gap:0.25rem;">
            <svg style="width:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <span>¡Alerta! Requieren atención</span>
        </div>
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
        <h2 style="font-size:1.1rem; margin-bottom:0.5rem;">Brecha de Accesibilidad</h2>
        <p style="color:#6B7280; font-size:0.85rem; margin-bottom:1.5rem;">Ajustes solicitados (Candidatos) vs. ofrecidos (Empresas).</p>
        
        <div style="margin-bottom:1.2rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">
                <span>Acceso con rampa</span> <span style="color:#6B7280; font-weight:normal;">Demanda 60% / Oferta 45%</span>
            </div>
            <div style="width:100%; height:12px; background:#E5E7EB; border-radius:6px; overflow:hidden; position:relative;">
                <div style="width:60%; height:100%; background:var(--primary); position:absolute; top:0; left:0; z-index:1;"></div>
                <div style="width:45%; height:100%; background:var(--success); position:absolute; top:0; left:0; z-index:2; border-right:2px solid #fff;"></div>
            </div>
        </div>
        
        <div style="margin-bottom:1.2rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">
                <span>Lector de pantalla (Software)</span> <span style="color:#6B7280; font-weight:normal;">Demanda 55% / Oferta 20%</span>
            </div>
            <div style="width:100%; height:12px; background:#E5E7EB; border-radius:6px; overflow:hidden; position:relative;">
                <div style="width:55%; height:100%; background:var(--primary); position:absolute; top:0; left:0; z-index:1;"></div>
                <div style="width:20%; height:100%; background:var(--success); position:absolute; top:0; left:0; z-index:2; border-right:2px solid #fff;"></div>
            </div>
        </div>
        
        <div style="margin-bottom:1.2rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">
                <span>Horario flexible</span> <span style="color:#6B7280; font-weight:normal;">Demanda 80% / Oferta 70%</span>
            </div>
            <div style="width:100%; height:12px; background:#E5E7EB; border-radius:6px; overflow:hidden; position:relative;">
                <div style="width:80%; height:100%; background:var(--primary); position:absolute; top:0; left:0; z-index:1;"></div>
                <div style="width:70%; height:100%; background:var(--success); position:absolute; top:0; left:0; z-index:2; border-right:2px solid #fff;"></div>
            </div>
        </div>

        <div style="display:flex; justify-content:center; gap:1.5rem; margin-top:1.5rem; font-size:0.85rem; color:#4B5563;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
                <div style="width:12px; height:12px; background:var(--primary); border-radius:3px;"></div>
                <span>Solicitado</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
                <div style="width:12px; height:12px; background:var(--success); border-radius:3px;"></div>
                <span>Ofrecido</span>
            </div>
        </div>
    </div>
</div>
@endsection

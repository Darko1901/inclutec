@extends('layouts.admin_layout')
@section('content')
<div x-data="{ tab: 'discapacidad' }">
    <div style="margin-bottom:2rem;">
        <h1>Catálogos del Sistema</h1>
        <p style="color: #6B7280;">Administra los listados maestros utilizados en toda la plataforma.</p>
    </div>

    <div style="display:flex; gap:1rem; border-bottom: 1px solid var(--border-color); margin-bottom:2rem;">
        <button @click="tab = 'discapacidad'" :style="tab === 'discapacidad' ? 'border-bottom: 3px solid var(--primary); font-weight:700; color:var(--text-color);' : 'color:#6B7280;'" style="padding: 1rem; background:none; border:none; cursor:pointer; font-size:1rem;">Tipos de Discapacidad</button>
        <button @click="tab = 'sectores'" :style="tab === 'sectores' ? 'border-bottom: 3px solid var(--primary); font-weight:700; color:var(--text-color);' : 'color:#6B7280;'" style="padding: 1rem; background:none; border:none; cursor:pointer; font-size:1rem;">Sectores Industriales</button>
    </div>

    <div x-show="tab === 'discapacidad'">
        <button class="btn btn-primary" style="margin-bottom:1.5rem;" @click="$dispatch('notify', {msg: 'Abriendo formulario...', type: 'success'})">+ Nuevo Tipo de Discapacidad</button>
        <div class="table-wrapper">
            <table aria-label="Catálogo de Discapacidades">
                <thead><tr><th>Clave</th><th>Descripción</th><th>Nivel de Soporte UI</th><th>Acciones</th></tr></thead>
                <tbody>
                    <tr><td>DIS-01</td><td>Visual</td><td><span class="badge badge-active">Alto</span></td><td><button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Modo edición activado', type: 'success'})">Editar</button></td></tr>
                    <tr><td>DIS-02</td><td>Auditiva</td><td><span class="badge badge-active">Alto</span></td><td><button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Modo edición activado', type: 'success'})">Editar</button></td></tr>
                    <tr><td>DIS-03</td><td>Motriz</td><td><span class="badge badge-pending">Medio</span></td><td><button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Modo edición activado', type: 'success'})">Editar</button></td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <div x-show="tab === 'sectores'" style="display:none;">
        <button class="btn btn-primary" style="margin-bottom:1.5rem;" @click="$dispatch('notify', {msg: 'Abriendo formulario...', type: 'success'})">+ Nuevo Sector Industrial</button>
        <div class="table-wrapper">
            <table aria-label="Sectores Industriales">
                <thead><tr><th>ID Sector</th><th>Nombre del Sector</th><th>Empresas Registradas</th><th>Acciones</th></tr></thead>
                <tbody>
                    <tr><td>SEC-01</td><td>Tecnología de la Información</td><td>45</td><td><button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Modo edición activado', type: 'success'})">Editar</button></td></tr>
                    <tr><td>SEC-02</td><td>Finanzas y Banca</td><td>12</td><td><button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Modo edición activado', type: 'success'})">Editar</button></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
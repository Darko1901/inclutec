@extends('layouts.admin_layout')
@section('content')
<div x-data="{ showBlockModal: false, selectedUser: '' }">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div><h1>Gestión de Usuarios</h1><p style="color: #6B7280; font-weight:500;">Administra los candidatos y reclutadores registrados en la plataforma.</p></div>
    </div>
    <div class="card" style="display: flex; gap: 1rem; padding: 1.25rem; align-items:center;">
        <input type="text" class="form-control" placeholder="Buscar por nombre o correo..." aria-label="Buscador de usuarios">
        <select class="form-control" style="width: 200px;"><option>Todos los roles</option><option>Candidatos</option><option>Reclutadores</option></select>
        <button class="btn btn-primary" @click="$dispatch('notify', {msg: 'Búsqueda completada', type: 'success'})">Buscar</button>
    </div>
    <div class="table-wrapper">
        <table aria-label="Lista de usuarios">
            <thead><tr><th>Nombre Completo</th><th>Correo Electrónico</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                <tr><td>Juan Pérez</td><td>juan.perez@correo.com</td><td>Candidato</td><td><span class="badge badge-active">Activo</span></td><td><button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="showBlockModal = true; selectedUser = 'Juan Pérez'">Bloquear</button></td></tr>
                <tr><td>María López</td><td>m.lopez@innovatech.com</td><td>Reclutador</td><td><span class="badge badge-pending">Revisión</span></td><td><button class="btn btn-success" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="$dispatch('notify', {msg: 'Usuario aprobado exitosamente', type: 'success'})">Aprobar</button></td></tr>
                <tr><td>Carlos Sánchez</td><td>carlos@mail.com</td><td>Candidato</td><td><span class="badge badge-banned">Bloqueado</span></td><td><button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="$dispatch('notify', {msg: 'Usuario desbloqueado', type: 'success'})">Desbloquear</button></td></tr>
            </tbody>
        </table>
    </div>
    <div class="modal-overlay" x-show="showBlockModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showBlockModal = false">
            <h2 class="modal-title">Bloquear Usuario</h2>
            <p>¿Estás seguro que deseas bloquear el acceso a <strong x-text="selectedUser"></strong>?</p>
            <div class="form-group" style="margin-top: 1.5rem;"><label class="form-label">Motivo del bloqueo</label><textarea class="form-control" rows="3" placeholder="Escribe el motivo..."></textarea></div>
            <div class="modal-actions"><button class="btn btn-outline" @click="showBlockModal = false">Cancelar</button><button class="btn btn-danger" @click="showBlockModal = false; $dispatch('notify', {msg: 'Usuario bloqueado', type: 'error'})">Confirmar Bloqueo</button></div>
        </div>
    </div>
</div>
@endsection
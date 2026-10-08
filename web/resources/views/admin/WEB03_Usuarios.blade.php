@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    showBlockModal: false, 
    selectedUser: null,
    search: '',
    filterRole: 'Todos',
    users: [
        { id: 1, name: 'Juan PÃ©rez', email: 'juan.perez@correo.com', role: 'Candidato', status: 'Activo' },
        { id: 2, name: 'MarÃ­a LÃ³pez', email: 'm.lopez@innovatech.com', role: 'Reclutador', status: 'RevisiÃ³n' },
        { id: 3, name: 'Carlos SÃ¡nchez', email: 'carlos@mail.com', role: 'Candidato', status: 'Bloqueado' }
    ],
    get filteredUsers() {
        return this.users.filter(u => {
            const mS = u.name.toLowerCase().includes(this.search.toLowerCase()) || u.email.toLowerCase().includes(this.search.toLowerCase());
            const mR = this.filterRole === 'Todos' || u.role === this.filterRole;
            return mS && mR;
        });
    },
    approveUser(user) { user.status = 'Activo'; $dispatch('notify', {msg: 'Usuario aprobado exitosamente', type: 'success'}); },
    unblockUser(user) { user.status = 'Activo'; $dispatch('notify', {msg: 'Usuario desbloqueado', type: 'success'}); },
    confirmBlock() {
        if(this.selectedUser) this.selectedUser.status = 'Bloqueado';
        this.showBlockModal = false;
        $dispatch('notify', {msg: 'Usuario bloqueado', type: 'error'});
    }
}">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div><h1>GestiÃ³n de Usuarios</h1><p style="color: #6B7280; font-weight:500;">Administra los candidatos y reclutadores registrados.</p></div>
    </div>
    <div class="card" style="display: flex; gap: 1rem; padding: 1.25rem; align-items:center;">
        <input type="text" class="form-control" placeholder="Buscar por nombre o correo..." x-model="search">
        <select class="form-control" style="width: 200px;" x-model="filterRole"><option>Todos</option><option>Candidato</option><option>Reclutador</option></select>
    </div>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Nombre Completo</th><th>Correo ElectrÃ³nico</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                <template x-for="user in filteredUsers" :key="user.id">
                    <tr x-transition>
                        <td x-text="user.name" style="font-weight:600;"></td>
                        <td x-text="user.email"></td>
                        <td x-text="user.role"></td>
                        <td>
                            <span class="badge" :class="{
                                'badge-active': user.status === 'Activo',
                                'badge-pending': user.status === 'RevisiÃ³n',
                                'badge-banned': user.status === 'Bloqueado'
                            }" x-text="user.status"></span>
                        </td>
                        <td>
                            <button x-show="user.status === 'Activo'" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="selectedUser = user; showBlockModal = true">Bloquear</button>
                            <button x-show="user.status === 'RevisiÃ³n'" class="btn btn-success" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="approveUser(user)">Aprobar</button>
                            <button x-show="user.status === 'Bloqueado'" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="unblockUser(user)">Desbloquear</button>
                        </td>
                    </tr>
                </template>
                <tr x-show="filteredUsers.length === 0"><td colspan="5" style="text-align:center; padding:2rem; color:#6B7280;">No se encontraron usuarios.</td></tr>
            </tbody>
        </table>
    </div>
    <div class="modal-overlay" x-show="showBlockModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showBlockModal = false">
            <h2 class="modal-title">Bloquear Usuario</h2>
            <p>Â¿EstÃ¡s seguro que deseas bloquear el acceso a <strong x-text="selectedUser?.name"></strong>?</p>
            <div class="form-group" style="margin-top: 1.5rem;"><label class="form-label">Motivo del bloqueo</label><textarea class="form-control" rows="3" placeholder="Escribe el motivo..."></textarea></div>
            <div class="modal-actions"><button class="btn btn-outline" @click="showBlockModal = false">Cancelar</button><button class="btn btn-danger" @click="confirmBlock()">Confirmar Bloqueo</button></div>
        </div>
    </div>
</div>
@endsection

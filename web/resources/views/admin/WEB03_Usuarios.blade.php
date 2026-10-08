@extends('layouts.admin_layout')
@section('content')
<div x-data="{ motivoBloqueo: '', 
    showBlockModal: false, 
    selectedUser: null,
    search: '',
    filterRole: 'Todos',
    users: [
        { id: 1, name: 'Juan Pérez', email: 'juan.perez@correo.com', role: 'Candidato', status: 'Activo' },
        { id: 2, name: 'María López', email: 'm.lopez@innovatech.com', role: 'Reclutador', status: 'Revisión' },
        { id: 3, name: 'Carlos Sánchez', email: 'carlos@mail.com', role: 'Candidato', status: 'Bloqueado' }
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
        if(this.motivoBloqueo.trim() === '') {
            $dispatch('notify', {msg: 'Error de validación: Debes escribir el motivo del bloqueo.', type: 'error'});
            return;
        }
        if(this.selectedUser) this.selectedUser.status = 'Bloqueado';
        this.showBlockModal = false;
        this.motivoBloqueo = '';
        $dispatch('notify', {msg: 'Usuario bloqueado correctamente', type: 'success'});
    }
}">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div><h1>Gestión de Usuarios</h1><p style="color: #6B7280; font-weight:500;">Administra los candidatos y reclutadores registrados.</p></div>
    </div>
    <div class="card" style="display: flex; gap: 1rem; padding: 1.25rem; align-items:center;">
        <input type="text" class="form-control" placeholder="Buscar por nombre o correo..." x-model="search">
        <select class="form-control" style="width: 200px;" x-model="filterRole"><option>Todos</option><option>Candidato</option><option>Reclutador</option></select>
    </div>
    <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
        <div style="display:flex; gap:0.5rem;">
            <button class="export-btn" @click="$dispatch('notify', {msg:'Generando archivo Excel...', type:'success'})">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Exportar a Excel
            </button>
            <button class="export-btn" @click="$dispatch('notify', {msg:'Generando reporte PDF...', type:'success'})">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg> Exportar a PDF
            </button>
        </div>

    </div>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Nombre Completo</th><th>Correo Electrónico</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                <template x-for="user in filteredUsers" :key="user.id">
                    <tr x-transition>
                        <td x-text="user.name" style="font-weight:600;"></td>
                        <td x-text="user.email"></td>
                        <td x-text="user.role"></td>
                        <td>
                            <span class="badge" :class="{
                                'badge-active': user.status === 'Activo',
                                'badge-pending': user.status === 'Revisión',
                                'badge-banned': user.status === 'Bloqueado'
                            }" x-text="user.status"></span>
                        </td>
                        <td>
                            <button x-show="user.status === 'Activo'" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="selectedUser = user; showBlockModal = true">Bloquear</button>
                            <button x-show="user.status === 'Revisión'" class="btn btn-success" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="approveUser(user)">Aprobar</button>
                            <button x-show="user.status === 'Bloqueado'" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="unblockUser(user)">Desbloquear</button>
                        </td>
                    </tr>
                </template>
                <tr x-show="filteredUsers.length === 0"><td colspan="5" style="text-align:center; padding:2rem; color:#6B7280;">No se encontraron usuarios.</td></tr>
            </tbody>
        </table>
    </div>
    <div class="modal-overlay" x-show="showBlockModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showBlockModal = false" x-trap.noscroll="showBlockModal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 class="modal-title" id="modal-title">Bloquear Usuario</h2>
            <p>¿Estás seguro que deseas bloquear el acceso a <strong x-text="selectedUser?.name"></strong>?</p>
            <div class="form-group" style="margin-top: 1.5rem;"><label class="form-label">Motivo del bloqueo</label><textarea class="form-control" rows="3" placeholder="Escribe el motivo..." x-model="motivoBloqueo"></textarea></div>
            <div class="modal-actions"><button class="btn btn-outline" @click="showBlockModal = false">Cancelar</button><button class="btn btn-danger" @click="confirmBlock()">Confirmar Bloqueo</button></div>
        </div>
    </div>
</div>
@endsection

@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    showValidateModal: false, 
    selectedEmpresa: null,
    empresas: [
        { id: 1, name: 'InnovaTech Soluciones S.A. de C.V.', rfc: 'INV001010A1', doc: 'Acta Constitutiva.pdf', status: 'Pendiente' },
        { id: 2, name: 'Global Corp México', rfc: 'GCM990202B2', doc: 'Registro_Fiscal.pdf', status: 'Pendiente' }
    ],
    get pending() { return this.empresas.filter(e => e.status === 'Pendiente'); },
    approve() {
        if(this.selectedEmpresa) this.selectedEmpresa.status = 'Aprobada';
        this.showValidateModal = false;
        $dispatch('notify', {msg: 'Empresa validada correctamente', type: 'success'});
    },
    reject() {
        if(this.selectedEmpresa) this.selectedEmpresa.status = 'Rechazada';
        this.showValidateModal = false;
        $dispatch('notify', {msg: 'Registro rechazado', type: 'error'});
    }
}">
    <div style="margin-bottom:2rem;"><h1>Validación de Empresas</h1><p style="color: #6B7280;">Revisa la documentación fiscal y legal de empresas recientes.</p></div>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Razón Social</th><th>RFC</th><th>Documentación</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                <template x-for="empresa in pending" :key="empresa.id">
                    <tr x-transition>
                        <td x-text="empresa.name" style="font-weight:600;"></td>
                        <td x-text="empresa.rfc"></td>
                        <td><a href="#" style="display:inline-flex; align-items:center; gap:0.25rem;"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg> <span x-text="empresa.doc"></span></a></td>
                        <td><span class="badge badge-pending">Pendiente de Revisión</span></td>
                        <td><button class="btn btn-success" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="selectedEmpresa = empresa; showValidateModal = true">Dictaminar</button></td>
                    </tr>
                </template>
                <tr x-show="pending.length === 0"><td colspan="5" style="text-align:center; padding:2rem; color:var(--success); font-weight:600;">Todas las empresas han sido validadas. ¡Buen trabajo!</td></tr>
            </tbody>
        </table>
    </div>
    <div class="modal-overlay" x-show="showValidateModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showValidateModal = false">
            <h2 class="modal-title">Dictamen de Empresa</h2>
            <p>Selecciona el resultado de la revisión para <strong x-text="selectedEmpresa?.name"></strong>.</p>
            <div class="form-group" style="margin-top: 1.5rem;"><label class="form-label">Notas del dictamen (opcional)</label><textarea class="form-control" rows="3"></textarea></div>
            <div class="modal-actions" style="justify-content: space-between;">
                <button class="btn btn-outline" @click="showValidateModal = false">Cancelar</button>
                <div style="display:flex; gap:1rem;"><button class="btn btn-danger" @click="reject()">Rechazar</button><button class="btn btn-success" @click="approve()">Aprobar</button></div>
            </div>
        </div>
    </div>
</div>
@endsection

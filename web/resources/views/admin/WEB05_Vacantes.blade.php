@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    showReviewModal: false,
    selectedVacante: null,
    vacantes: [
        { id: 1, title: 'Diseñador UX/UI', empresa: 'InnovaTech', reportes: 3, status: 'Pública' },
        { id: 2, title: 'Analista de Datos', empresa: 'Finanzas Sur', reportes: 1, status: 'Pública' }
    ],
    get activas() { return this.vacantes.filter(v => v.status === 'Pública'); },
    hideVacante() {
        if(this.selectedVacante) this.selectedVacante.status = 'Oculta';
        this.showReviewModal = false;
        $dispatch('notify', {msg: 'Vacante dada de baja del sistema', type: 'error'});
    }
}">
    <h1>Moderación de Vacantes</h1>
    <p style="color:#6B7280; margin-bottom:2rem;">Revisa que las vacantes cumplan con los lineamientos de lenguaje inclusivo.</p>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Vacante</th><th>Empresa</th><th>Reportes</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                <template x-for="v in activas" :key="v.id">
                    <tr x-transition>
                        <td x-text="v.title" style="font-weight:600;"></td><td x-text="v.empresa"></td>
                        <td><span style="color:var(--danger); font-weight:800;" x-text="v.reportes + ' Usuarios'"></span></td>
                        <td><span class="badge badge-active">Pública</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem;" @click="selectedVacante = v; showReviewModal = true">Revisar y Actuar</button>
                        </td>
                    </tr>
                </template>
                <tr x-show="activas.length === 0"><td colspan="5" style="text-align:center; padding:2rem; color:var(--success); font-weight:600;">No hay vacantes reportadas actualmente.</td></tr>
            </tbody>
        </table>
    </div>
    <div class="modal-overlay" x-show="showReviewModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showReviewModal = false" x-trap.noscroll="showReviewModal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 class="modal-title" id="modal-title">Detalle de Reportes</h2>
            <p style="margin-bottom:1rem;">Analizando vacante: <strong x-text="selectedVacante?.title"></strong></p>
            <div style="background:#FEE2E2; border:1px solid #FECACA; padding:1rem; border-radius:4px; margin-bottom:1.5rem; color:#B91C1C;">
                <strong>Motivo principal:</strong> "La vacante exige esfuerzo físico no relacionado al puesto, discriminando a personas con discapacidad motriz."
            </div>
            <div class="modal-actions">
                <button class="btn btn-outline" @click="showReviewModal = false">Cerrar (Ignorar)</button>
                <button class="btn btn-danger" @click="hideVacante()">Dar de baja Vacante</button>
            </div>
        </div>
    </div>
</div>
@endsection

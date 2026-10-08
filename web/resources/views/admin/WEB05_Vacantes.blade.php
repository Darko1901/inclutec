@extends('layouts.admin_layout')
@section('content')
<div x-data="{ showReviewModal: false }">
    <h1>Moderación de Vacantes</h1>
    <p style="color:#6B7280; margin-bottom:2rem;">Revisa que las vacantes cumplan con los lineamientos de lenguaje inclusivo.</p>
    <div class="table-wrapper">
        <table aria-label="Vacantes reportadas">
            <thead>
                <tr><th>Vacante</th><th>Empresa</th><th>Reportes</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>Diseñador UX/UI</td><td>InnovaTech</td><td><span style="color:var(--danger); font-weight:800;">3 Usuarios</span></td>
                    <td><span class="badge badge-active">Pública</span></td>
                    <td>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem;" @click="showReviewModal = true">Revisar Reportes</button>
                        <button class="btn btn-danger" style="padding: 0.4rem 0.8rem;" @click="$dispatch('notify', {msg: 'Vacante oculta por el administrador', type: 'error'})">Ocultar</button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Modal Revision -->
    <div class="modal-overlay" x-show="showReviewModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showReviewModal = false">
            <h2 class="modal-title">Detalle de Reportes</h2>
            <div style="background:#FEE2E2; border:1px solid #FECACA; padding:1rem; border-radius:4px; margin-bottom:1.5rem; color:#B91C1C;">
                <strong>Motivo principal:</strong> "La vacante exige esfuerzo físico no relacionado al puesto, discriminando a personas con discapacidad motriz."
            </div>
            <div class="modal-actions">
                <button class="btn btn-outline" @click="showReviewModal = false">Cerrar</button>
                <button class="btn btn-danger" @click="showReviewModal = false; $dispatch('notify', {msg: 'La vacante ha sido dada de baja', type: 'error'})">Dar de baja Vacante</button>
            </div>
        </div>
    </div>
</div>
@endsection
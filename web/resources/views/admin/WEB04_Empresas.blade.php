@extends('layouts.admin_layout')
@section('content')
<div x-data="{ showValidateModal: false, selectedEmpresa: '' }">
    <div style="margin-bottom:2rem;">
        <h1>Validación de Empresas</h1>
        <p style="color: #6B7280;">Revisa la documentación fiscal y legal subida por las empresas de reciente registro.</p>
    </div>

    <div class="table-wrapper">
        <table aria-label="Empresas pendientes de validación">
            <thead>
                <tr><th>ID</th><th>Razón Social</th><th>RFC</th><th>Documentación</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong style="color:var(--primary);">#EMP-089</strong></td>
                    <td>InnovaTech Soluciones S.A. de C.V.</td>
                    <td>INV001010A1</td>
                    <td><a href="#" style="display:inline-flex; align-items:center; gap:0.25rem;"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg> Acta Constitutiva.pdf</a></td>
                    <td><span class="badge badge-pending">Pendiente de Revisión</span></td>
                    <td>
                        <button class="btn btn-success" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="showValidateModal = true; selectedEmpresa = 'InnovaTech Soluciones S.A. de C.V.'">Dictaminar</button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Modal Validacion -->
    <div class="modal-overlay" x-show="showValidateModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showValidateModal = false">
            <h2 class="modal-title">Dictamen de Empresa</h2>
            <p>Selecciona el resultado de la revisión legal para la empresa <strong x-text="selectedEmpresa"></strong>.</p>
            
            <div class="form-group" style="margin-top: 1.5rem;">
                <label class="form-label">Notas del dictamen (opcional)</label>
                <textarea class="form-control" rows="3" placeholder="Todo en orden / Falta firma electrónica..."></textarea>
            </div>

            <div class="modal-actions" style="justify-content: space-between;">
                <button class="btn btn-outline" @click="showValidateModal = false">Cancelar</button>
                <div style="display:flex; gap:1rem;">
                    <button class="btn btn-danger" @click="showValidateModal = false">Rechazar Registro</button>
                    <button class="btn btn-success" @click="showValidateModal = false">Aprobar Empresa</button>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

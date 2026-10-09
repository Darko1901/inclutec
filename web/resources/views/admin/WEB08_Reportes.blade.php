@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    reports: [
        { id: '#REP-001', user: 'Juan Pérez', subject: 'Discriminación en entrevista', date: '08/10/2026', status: 'Abierto' },
        { id: '#REP-002', user: 'María López', subject: 'Vacante engañosa o fraudulenta', date: '08/10/2026', status: 'Abierto' }
    ],
    resolve(report) {
        report.status = 'Resuelto';
        $dispatch('notify', {msg: report.id + ' marcado como Resuelto', type: 'success'});
    }
}">
    <h1>Moderación de Reportes</h1>
    <p style="color:#6B7280; margin-bottom:2rem;">Atiende los reportes de discriminación o mal comportamiento en la plataforma.</p>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Reporte ID</th><th>Usuario</th><th>Motivo</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                <template x-for="t in reports" :key="t.id">
                    <tr x-transition>
                        <td><strong style="color:var(--primary);" x-text="t.id"></strong></td><td x-text="t.user"></td><td x-text="t.subject"></td><td x-text="t.date"></td>
                        <td><span class="badge" :class="{'badge-pending': t.status === 'Abierto', 'badge-active': t.status === 'Resuelto'}" x-text="t.status"></span></td>
                        <td>
                            <button x-show="t.status === 'Abierto'" class="btn btn-success" style="padding: 0.4rem 0.8rem;" @click="resolve(t)">Marcar Resuelto</button>
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
</div>
@endsection

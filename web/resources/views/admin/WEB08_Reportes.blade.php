@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    tickets: [
        { id: '#TCK-991', user: 'Juan Pérez', subject: 'Lector de pantalla no lee el botón de aplicar', date: '08/10/2026', status: 'Abierto' },
        { id: '#TCK-992', user: 'María López', subject: 'Error al subir foto de perfil', date: '08/10/2026', status: 'Abierto' }
    ],
    resolve(ticket) {
        ticket.status = 'Resuelto';
        $dispatch('notify', {msg: ticket.id + ' marcado como Resuelto', type: 'success'});
    }
}">
    <h1>Reportes e Incidencias (Tickets)</h1>
    <p style="color:#6B7280; margin-bottom:2rem;">Atiende las quejas o problemas técnicos de los usuarios.</p>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Ticket ID</th><th>Usuario</th><th>Asunto</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                <template x-for="t in tickets" :key="t.id">
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

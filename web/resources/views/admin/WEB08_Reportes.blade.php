@extends('layouts.admin_layout')
@section('content')
<h1>Reportes e Incidencias (Tickets)</h1>
<p style="color:#6B7280; margin-bottom:2rem;">Atiende las quejas o problemas técnicos de los usuarios.</p>
<div class="table-wrapper">
    <table aria-label="Tickets de soporte">
        <thead>
            <tr><th>Ticket ID</th><th>Usuario</th><th>Asunto</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
            <tr>
                <td><strong style="color:var(--primary);">#TCK-991</strong></td><td>Juan Pérez</td><td>Lector de pantalla no lee el botón de aplicar</td><td>08/10/2026</td>
                <td><span class="badge badge-pending">Abierto</span></td>
                <td><button class="btn btn-success" style="padding: 0.4rem 0.8rem;" @click="$dispatch('notify', {msg: 'Ticket #TCK-991 marcado como Resuelto', type: 'success'})">Marcar Resuelto</button></td>
            </tr>
        </tbody>
    </table>
</div>
@endsection
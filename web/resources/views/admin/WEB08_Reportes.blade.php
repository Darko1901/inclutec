@extends('layouts.admin_layout')
@section('content')
<h1>Reportes e Incidencias (Tickets)</h1>
<div class="table-wrapper">
    <table aria-label="Lista de tickets de soporte técnico">
        <thead>
            <tr><th>Ticket ID</th><th>Usuario</th><th>Asunto</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>#TCK-991</td><td>Juan Pérez</td><td>Problema con lector de pantalla</td><td>08/10/2026</td>
                <td><span class="badge badge-pending">Abierto</span></td>
                <td><button class="btn btn-primary" style="padding: 0.25rem 0.5rem;">Resolver</button></td>
            </tr>
        </tbody>
    </table>
</div>
@endsection

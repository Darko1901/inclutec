@extends('layouts.admin_layout')
@section('content')
<h1>Moderación de Vacantes</h1>
<p>Revisa que las vacantes cumplan con los lineamientos de inclusión.</p>
<div class="table-wrapper">
    <table aria-label="Lista de vacantes reportadas o en revisión">
        <thead>
            <tr><th>Vacante</th><th>Empresa</th><th>Reportes</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>Diseñador UX/UI</td><td>InnovaTech</td><td><span style="color: var(--danger); font-weight: bold;">3</span></td>
                <td><span class="badge badge-active">Publicada</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;">Revisar</button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem;">Ocultar</button>
                </td>
            </tr>
        </tbody>
    </table>
</div>
@endsection

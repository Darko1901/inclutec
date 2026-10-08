@extends('layouts.admin_layout')
@section('content')
<h1>Gestión de Usuarios</h1>
<div style="margin-bottom: 1.5rem; display: flex; gap: 1rem;">
    <input type="text" class="form-control" placeholder="Buscar por nombre o correo..." aria-label="Buscador de usuarios">
    <button class="btn btn-primary">Buscar</button>
</div>
<div class="table-wrapper">
    <table aria-label="Lista de usuarios del sistema">
        <thead>
            <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>001</td><td>Juan Pérez</td><td>juan@correo.com</td><td>Candidato</td>
                <td><span class="badge badge-active">Activo</span></td>
                <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem;">Bloquear</button></td>
            </tr>
            <tr>
                <td>002</td><td>María López</td><td>maria@empresa.com</td><td>Reclutador</td>
                <td><span class="badge badge-pending">Revisión</span></td>
                <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem;">Aprobar</button></td>
            </tr>
        </tbody>
    </table>
</div>
@endsection

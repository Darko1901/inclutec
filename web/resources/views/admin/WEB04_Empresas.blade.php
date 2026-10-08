@extends('layouts.admin_layout')
@section('content')
<h1>Validación de Empresas</h1>
<p>Revisa la documentación subida por las empresas nuevas.</p>
<div class="table-wrapper">
    <table aria-label="Lista de empresas pendientes de validación">
        <thead>
            <tr><th>Empresa</th><th>RFC</th><th>Documentos</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>InnovaTech</td><td>INV001010A1</td><td><a href="#">Ver Acta Constitutiva</a></td>
                <td><span class="badge badge-pending">Pendiente</span></td>
                <td>
                    <button class="btn btn-success" style="padding: 0.25rem 0.5rem;">Validar</button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem;">Rechazar</button>
                </td>
            </tr>
        </tbody>
    </table>
</div>
@endsection

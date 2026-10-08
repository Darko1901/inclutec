@extends('layouts.admin_layout')
@section('content')
<h1>Habilidades y Categorías</h1>
<div style="margin-bottom: 1.5rem;">
    <button class="btn btn-primary">+ Agregar Nueva Habilidad</button>
</div>
<div class="table-wrapper">
    <table aria-label="Catálogo de habilidades">
        <thead>
            <tr><th>ID</th><th>Habilidad</th><th>Categoría</th><th>Acciones</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>101</td><td>Lector de Pantalla NVDA</td><td>Herramientas de Accesibilidad</td>
                <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem;">Editar</button></td>
            </tr>
            <tr>
                <td>102</td><td>Lenguaje de Señas</td><td>Comunicación</td>
                <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem;">Editar</button></td>
            </tr>
        </tbody>
    </table>
</div>
@endsection

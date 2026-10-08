@extends('layouts.admin_layout')
@section('content')
<div x-data="{ showSkillModal: false }">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div>
            <h1>Catálogo de Habilidades</h1>
            <p style="color: #6B7280;">Configura las habilidades y categorías disponibles para candidatos y vacantes.</p>
        </div>
        <button class="btn btn-primary" @click="showSkillModal = true">+ Agregar Habilidad</button>
    </div>

    <div class="table-wrapper">
        <table aria-label="Catálogo de habilidades">
            <thead>
                <tr><th>ID Habilidad</th><th>Nombre de la Habilidad</th><th>Categoría</th><th>Uso Actual</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong style="color:var(--primary);">#SK-101</strong></td>
                    <td>Lector de Pantalla NVDA</td>
                    <td><span class="badge badge-active" style="background:#E0E7FF; color:#4338CA; border:none;">Herramientas Accesibilidad</span></td>
                    <td>145 Usuarios</td>
                    <td>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;">Editar</button>
                        <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size:0.8rem;">Eliminar</button>
                    </td>
                </tr>
                <tr>
                    <td><strong style="color:var(--primary);">#SK-102</strong></td>
                    <td>Lenguaje de Señas Mexicano (LSM)</td>
                    <td><span class="badge badge-active" style="background:#FEF3C7; color:#D97706; border:none;">Comunicación</span></td>
                    <td>312 Usuarios</td>
                    <td>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;">Editar</button>
                        <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size:0.8rem;">Eliminar</button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Modal Agregar Habilidad -->
    <div class="modal-overlay" x-show="showSkillModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showSkillModal = false">
            <h2 class="modal-title">Nueva Habilidad</h2>
            <div class="form-group">
                <label class="form-label">Nombre de la habilidad</label>
                <input type="text" class="form-control" placeholder="Ej. Diseño UI Adaptativo">
            </div>
            <div class="form-group">
                <label class="form-label">Categoría</label>
                <select class="form-control">
                    <option>Diseño y Creatividad</option>
                    <option>Tecnología y Software</option>
                    <option>Comunicación</option>
                    <option>Herramientas de Accesibilidad</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn btn-outline" @click="showSkillModal = false">Cancelar</button>
                <button class="btn btn-success" @click="showSkillModal = false">Guardar Habilidad</button>
            </div>
        </div>
    </div>
</div>
@endsection

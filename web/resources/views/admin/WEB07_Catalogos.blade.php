@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    tab: 'discapacidad', 
    showModal: false, 
    modalMode: 'add', 
    modalTitle: '',
    itemName: '',
    itemLevel: '',
    openModal(mode, title, name='', level='') {
        this.modalMode = mode;
        this.modalTitle = title;
        this.itemName = name;
        this.itemLevel = level;
        this.showModal = true;
    }
}">
    <!-- Header with Action Button -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem;">
        <div>
            <h1>Catálogos del Sistema</h1>
            <p style="color: #6B7280;">Administra los listados maestros utilizados en toda la plataforma.</p>
        </div>
        <button class="btn btn-primary" style="box-shadow: 0 10px 15px -3px rgba(0,82,255,0.3);" @click="openModal('add', tab === 'discapacidad' ? 'Nueva Discapacidad' : 'Nuevo Sector')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span x-text="tab === 'discapacidad' ? 'Nueva Discapacidad' : 'Nuevo Sector'"></span>
        </button>
    </div>

    <!-- Segmented Control Tabs (Modern Design) -->
    <div style="background:var(--secondary); padding:0.4rem; border-radius:8px; display:inline-flex; gap:0.5rem; margin-bottom:2rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
        <button @click="tab = 'discapacidad'" :style="tab === 'discapacidad' ? 'background:#FFF; color:var(--text-color); box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:transparent; color:#6B7280;'" style="padding: 0.6rem 1.5rem; border:none; border-radius:6px; font-weight:600; cursor:pointer; transition:all 0.2s;">
            Tipos de Discapacidad
        </button>
        <button @click="tab = 'sectores'" :style="tab === 'sectores' ? 'background:#FFF; color:var(--text-color); box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:transparent; color:#6B7280;'" style="padding: 0.6rem 1.5rem; border:none; border-radius:6px; font-weight:600; cursor:pointer; transition:all 0.2s;">
            Sectores Industriales
        </button>
    </div>

    <!-- Filters/Search Bar -->
    <div class="card" style="display: flex; gap: 1rem; padding: 1.25rem; margin-bottom:1.5rem; align-items:center;">
        <div style="position:relative; flex:1;">
            <svg fill="none" stroke="#9CA3AF" viewBox="0 0 24 24" style="width:20px; position:absolute; left:1rem; top:50%; transform:translateY(-50%);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" class="form-control" placeholder="Buscar elemento en el catálogo..." style="padding-left:3rem;">
        </div>
        <button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Búsqueda procesada', type: 'success'})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            Filtrar
        </button>
    </div>

    <!-- Tab Content: Discapacidad -->
    <div x-show="tab === 'discapacidad'" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0">
        <div class="table-wrapper">
            <table aria-label="Catálogo de Discapacidades">
                <thead><tr><th>Clave</th><th>Descripción</th><th>Nivel de Soporte UI</th><th>Usuarios Registrados</th><th>Acciones</th></tr></thead>
                <tbody>
                    <tr>
                        <td><strong style="color:var(--primary);">DIS-01</strong></td>
                        <td><div style="font-weight:700;">Discapacidad Visual</div><div style="font-size:0.8rem; color:#6B7280;">Ceguera total o debilidad visual</div></td>
                        <td><span class="badge badge-active" style="background:#E0E7FF; color:#4338CA; border:none;">Alto (Lectores de Pantalla)</span></td>
                        <td><strong style="font-size:1.1rem;">1,245</strong></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openModal('edit', 'Editar Discapacidad', 'Discapacidad Visual', 'Alto')">Editar</button>
                        </td>
                    </tr>
                    <tr>
                        <td><strong style="color:var(--primary);">DIS-02</strong></td>
                        <td><div style="font-weight:700;">Discapacidad Auditiva</div><div style="font-size:0.8rem; color:#6B7280;">Sordera o hipoacusia</div></td>
                        <td><span class="badge badge-active" style="background:#E0E7FF; color:#4338CA; border:none;">Alto (Textos descriptivos)</span></td>
                        <td><strong style="font-size:1.1rem;">890</strong></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openModal('edit', 'Editar Discapacidad', 'Discapacidad Auditiva', 'Alto')">Editar</button>
                        </td>
                    </tr>
                    <tr>
                        <td><strong style="color:var(--primary);">DIS-03</strong></td>
                        <td><div style="font-weight:700;">Discapacidad Motriz</div><div style="font-size:0.8rem; color:#6B7280;">Limitación de movimiento físico</div></td>
                        <td><span class="badge badge-pending" style="background:#FEF3C7; color:#D97706; border:none;">Medio (Navegación por teclado)</span></td>
                        <td><strong style="font-size:1.1rem;">450</strong></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openModal('edit', 'Editar Discapacidad', 'Discapacidad Motriz', 'Medio')">Editar</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Tab Content: Sectores -->
    <div x-show="tab === 'sectores'" style="display:none;" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0">
        <div class="table-wrapper">
            <table aria-label="Sectores Industriales">
                <thead><tr><th>ID Sector</th><th>Nombre del Sector</th><th>Empresas Registradas</th><th>Vacantes Activas</th><th>Acciones</th></tr></thead>
                <tbody>
                    <tr>
                        <td><strong style="color:var(--primary);">SEC-01</strong></td>
                        <td><div style="font-weight:700; font-size:1rem;">Tecnología de la Información</div></td>
                        <td><span style="font-weight:700; font-size:1.1rem;">45</span> empresas</td>
                        <td><span style="font-weight:700; color:var(--success); font-size:1.1rem;">112</span> vacantes</td>
                        <td><button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openModal('edit', 'Editar Sector', 'Tecnología de la Información')">Editar</button></td>
                    </tr>
                    <tr>
                        <td><strong style="color:var(--primary);">SEC-02</strong></td>
                        <td><div style="font-weight:700; font-size:1rem;">Finanzas y Banca</div></td>
                        <td><span style="font-weight:700; font-size:1.1rem;">12</span> empresas</td>
                        <td><span style="font-weight:700; color:var(--success); font-size:1.1rem;">34</span> vacantes</td>
                        <td><button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openModal('edit', 'Editar Sector', 'Finanzas y Banca')">Editar</button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal CRUD (Create/Update) -->
    <div class="modal-overlay" x-show="showModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showModal = false">
            <h2 class="modal-title" x-text="modalTitle"></h2>
            
            <div class="form-group" style="margin-top:1.5rem;">
                <label class="form-label">Nombre del elemento</label>
                <input type="text" class="form-control" x-model="itemName" placeholder="Ej. Nuevo sector...">
            </div>

            <div class="form-group" x-show="tab === 'discapacidad'">
                <label class="form-label">Nivel de Soporte UI</label>
                <select class="form-control" x-model="itemLevel">
                    <option value="">Seleccione el nivel...</option>
                    <option value="Alto">Alto (Soporte completo)</option>
                    <option value="Medio">Medio (Soporte parcial)</option>
                    <option value="Bajo">Bajo (En desarrollo)</option>
                </select>
            </div>

            <div class="modal-actions" style="justify-content: space-between;">
                <button x-show="modalMode === 'edit'" class="btn btn-danger" @click="showModal = false; $dispatch('notify', {msg: 'Elemento eliminado correctamente', type: 'error'})">Eliminar</button>
                <div style="display:flex; gap:1rem; margin-left:auto;">
                    <button class="btn btn-outline" @click="showModal = false">Cancelar</button>
                    <button class="btn btn-primary" @click="showModal = false; $dispatch('notify', {msg: 'Cambios guardados con éxito', type: 'success'})">Guardar</button>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
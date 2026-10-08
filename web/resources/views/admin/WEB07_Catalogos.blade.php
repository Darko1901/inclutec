@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    tab: 'discapacidad', showModal: false, modalMode: 'add', currentId: null,
    itemName: '', itemLevel: '',
    discapacidades: [
        { id: 1, name: 'Discapacidad Visual', desc: 'Ceguera total o debilidad visual', level: 'Alto' },
        { id: 2, name: 'Discapacidad Auditiva', desc: 'Sordera o hipoacusia', level: 'Alto' },
        { id: 3, name: 'Discapacidad Motriz', desc: 'Limitación de movimiento físico', level: 'Medio' }
    ],
    sectores: [
        { id: 1, name: 'Tecnología de la Información', emps: 45, vacs: 112 },
        { id: 2, name: 'Finanzas y Banca', emps: 12, vacs: 34 }
    ],
    openModal(mode, item=null) {
        this.modalMode = mode;
        if(mode === 'edit') {
            this.currentId = item.id;
            this.itemName = item.name;
            this.itemLevel = item.level || '';
        } else {
            this.itemName = ''; this.itemLevel = '';
        }
        this.showModal = true;
    },
    save() {
        if(this.tab === 'discapacidad') {
            if(this.modalMode === 'edit') { let i = this.discapacidades.find(x=>x.id===this.currentId); i.name = this.itemName; i.level = this.itemLevel; }
            else { this.discapacidades.push({id: Date.now(), name: this.itemName, desc: 'Agregada manualmente', level: this.itemLevel}); }
        } else {
            if(this.modalMode === 'edit') { let i = this.sectores.find(x=>x.id===this.currentId); i.name = this.itemName; }
            else { this.sectores.push({id: Date.now(), name: this.itemName, emps: 0, vacs: 0}); }
        }
        this.showModal = false; $dispatch('notify', {msg: 'Guardado con éxito', type: 'success'});
    },
    remove() {
        if(this.tab === 'discapacidad') this.discapacidades = this.discapacidades.filter(x=>x.id !== this.currentId);
        else this.sectores = this.sectores.filter(x=>x.id !== this.currentId);
        this.showModal = false; $dispatch('notify', {msg: 'Eliminado', type: 'error'});
    }
}">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem;">
        <div><h1>Catálogos del Sistema</h1><p style="color: #6B7280;">Administra los listados maestros.</p></div>
        <button class="btn btn-primary" @click="openModal('add')">
            <span x-text="tab === 'discapacidad' ? '+ Nueva Discapacidad' : '+ Nuevo Sector'"></span>
        </button>
    </div>
    <div class="tabs-container">
        <button @click="tab = 'discapacidad'" class="tab-btn" :class="{ 'active': tab === 'discapacidad' }">Tipos de Discapacidad</button>
        <button @click="tab = 'sectores'" class="tab-btn" :class="{ 'active': tab === 'sectores' }">Sectores Industriales</button>
    </div>
    <div x-show="tab === 'discapacidad'" x-transition>
        <div class="table-wrapper">
            <table>
                <thead><tr><th>Descripción</th><th>Nivel de Soporte UI</th><th>Acciones</th></tr></thead>
                <tbody>
                    <template x-for="d in discapacidades" :key="d.id">
                        <tr x-transition>
                            <td><div style="font-weight:700;" x-text="d.name"></div><div style="font-size:0.8rem; color:#6B7280;" x-text="d.desc"></div></td>
                            <td><span class="badge" :class="{'badge-active': d.level==='Alto', 'badge-pending': d.level==='Medio', 'badge-banned': d.level==='Bajo'}" x-text="d.level"></span></td>
                            <td><button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openModal('edit', d)">Editar</button></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
    <div x-show="tab === 'sectores'" style="display:none;" x-transition>
        <div class="table-wrapper">
            <table>
                <thead><tr><th>Nombre del Sector</th><th>Empresas Registradas</th><th>Vacantes Activas</th><th>Acciones</th></tr></thead>
                <tbody>
                    <template x-for="s in sectores" :key="s.id">
                        <tr x-transition>
                            <td><div style="font-weight:700; font-size:1rem;" x-text="s.name"></div></td>
                            <td><span style="font-weight:700; font-size:1.1rem;" x-text="s.emps"></span> empresas</td>
                            <td><span style="font-weight:700; color:var(--success); font-size:1.1rem;" x-text="s.vacs"></span> vacantes</td>
                            <td><button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openModal('edit', s)">Editar</button></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
    <div class="modal-overlay" x-show="showModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showModal = false">
            <h2 class="modal-title" x-text="modalMode === 'add' ? 'Crear Nuevo' : 'Editar Elemento'"></h2>
            <div class="form-group" style="margin-top:1.5rem;"><label class="form-label">Nombre del elemento</label><input type="text" class="form-control" x-model="itemName"></div>
            <div class="form-group" x-show="tab === 'discapacidad'"><label class="form-label">Nivel de Soporte UI</label><select class="form-control" x-model="itemLevel"><option value="">Seleccione el nivel...</option><option value="Alto">Alto</option><option value="Medio">Medio</option><option value="Bajo">Bajo</option></select></div>
            <div class="modal-actions" style="justify-content: space-between;">
                <button x-show="modalMode === 'edit'" class="btn btn-danger" @click="remove()">Eliminar</button>
                <div style="display:flex; gap:1rem; margin-left:auto;"><button class="btn btn-outline" @click="showModal = false">Cancelar</button><button class="btn btn-primary" @click="save()">Guardar</button></div>
            </div>
        </div>
    </div>
</div>
@endsection

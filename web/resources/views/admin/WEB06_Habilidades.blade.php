@extends('layouts.admin_layout')
@section('content')
<div x-data="{ 
    showModal: false, editMode: false, currentId: null,
    formName: '', formCat: 'Diseño y Creatividad',
    habilidades: [
        { id: 1, name: 'Lector de Pantalla NVDA', cat: 'Herramientas de Accesibilidad', color: '#E0E7FF', text: '#4338CA', users: 145 },
        { id: 2, name: 'Lenguaje de Señas Mexicano (LSM)', cat: 'Comunicación', color: '#FEF3C7', text: '#D97706', users: 312 }
    ],
    openAdd() { this.editMode = false; this.formName = ''; this.formCat = 'Diseño y Creatividad'; this.showModal = true; },
    openEdit(h) { this.editMode = true; this.currentId = h.id; this.formName = h.name; this.formCat = h.cat; this.showModal = true; },
    save() {
        if(this.editMode) {
            let h = this.habilidades.find(x => x.id === this.currentId);
            h.name = this.formName; h.cat = this.formCat;
        } else {
            this.habilidades.push({ id: Date.now(), name: this.formName, cat: this.formCat, color: '#D1FAE5', text: '#047857', users: 0 });
        }
        this.showModal = false;
        $dispatch('notify', {msg: 'Habilidad guardada', type: 'success'});
    },
    remove(id) {
        this.habilidades = this.habilidades.filter(h => h.id !== id);
        $dispatch('notify', {msg: 'Habilidad eliminada', type: 'error'});
    }
}">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div><h1>Catálogo de Habilidades</h1><p style="color: #6B7280;">Configura las habilidades y categorías disponibles.</p></div>
        <button class="btn btn-primary" @click="openAdd()">+ Agregar Habilidad</button>
    </div>
    <div class="table-wrapper">
        <table>
            <thead><tr><th>Nombre de la Habilidad</th><th>Categoría</th><th>Uso Actual</th><th>Acciones</th></tr></thead>
            <tbody>
                <template x-for="h in habilidades" :key="h.id">
                    <tr x-transition>
                        <td x-text="h.name" style="font-weight:600;"></td>
                        <td><span class="badge" :style="ackground:+h.color+; color:+h.text+; border:none;" x-text="h.cat"></span></td>
                        <td x-text="h.users + ' Usuarios'"></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="openEdit(h)">Editar</button> 
                            <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" @click="remove(h.id)">Eliminar</button>
                        </td>
                    </tr>
                </template>
                <tr x-show="habilidades.length === 0"><td colspan="4" style="text-align:center; padding:2rem;">No hay habilidades registradas.</td></tr>
            </tbody>
        </table>
    </div>
    <div class="modal-overlay" x-show="showModal" style="display: none;" x-transition>
        <div class="modal-content" @click.away="showModal = false">
            <h2 class="modal-title" x-text="editMode ? 'Editar Habilidad' : 'Nueva Habilidad'"></h2>
            <div class="form-group"><label class="form-label">Nombre de la habilidad</label><input type="text" class="form-control" x-model="formName"></div>
            <div class="form-group">
                <label class="form-label">Categoría</label>
                <select class="form-control" x-model="formCat"><option>Diseño y Creatividad</option><option>Tecnología y Software</option><option>Comunicación</option><option>Herramientas de Accesibilidad</option></select>
            </div>
            <div class="modal-actions"><button class="btn btn-outline" @click="showModal = false">Cancelar</button><button class="btn btn-success" @click="save()">Guardar</button></div>
        </div>
    </div>
</div>
@endsection

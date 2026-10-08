@extends('layouts.admin_layout')
@section('content')
<div style="margin-bottom:2rem;"><h1>Configuración del Sistema</h1></div>
<div class="card">
    <table style="border:none;">
        <tbody>
            <tr>
                <td style="border:none; padding-bottom:1rem;">
                    <strong>Modo Mantenimiento</strong>
                    <p style="color:#6B7280; font-size:0.85rem;">Deshabilita el acceso a los usuarios.</p>
                </td>
                <td style="border:none; text-align:right;">
                    <button class="btn btn-outline" @click="$dispatch('notify', {msg: 'Modo mantenimiento activado', type: 'error'})">Activar</button>
                </td>
            </tr>
            <tr style="border-top: 1px solid var(--border-color);">
                <td style="border:none; padding-top:1rem;">
                    <strong>Respaldos Automáticos</strong>
                </td>
                <td style="border:none; text-align:right; padding-top:1rem;">
                    <select class="form-control" style="width:auto; display:inline-block;" @change="$dispatch('notify', {msg: 'Frecuencia de respaldo guardada', type: 'success'})">
                        <option>Diario</option><option>Semanal</option><option>Mensual</option>
                    </select>
                </td>
            </tr>
        </tbody>
    </table>
</div>
@endsection
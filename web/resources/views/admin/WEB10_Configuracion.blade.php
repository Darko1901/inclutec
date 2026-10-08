@extends('layouts.admin_layout')
@section('content')
<div style="margin-bottom:2rem;">
    <h1>Configuración del Sistema</h1>
    <p style="color: #6B7280;">Ajustes globales de la plataforma IncluTec.</p>
</div>

<div class="card">
    <table style="border:none;">
        <tbody>
            <tr>
                <td style="border:none; padding-bottom:1rem;">
                    <strong>Modo Mantenimiento</strong>
                    <p style="color:#6B7280; font-size:0.85rem;">Deshabilita el acceso a los usuarios mientras se actualiza el sistema.</p>
                </td>
                <td style="border:none; text-align:right;">
                    <button class="btn btn-outline">Activar</button>
                </td>
            </tr>
            <tr style="border-top: 1px solid var(--border-color);">
                <td style="border:none; padding-top:1rem;">
                    <strong>Respaldos Automáticos</strong>
                    <p style="color:#6B7280; font-size:0.85rem;">Frecuencia con la que se respalda la base de datos.</p>
                </td>
                <td style="border:none; text-align:right; padding-top:1rem;">
                    <select class="form-control" style="width:auto; display:inline-block;">
                        <option>Diario</option>
                        <option>Semanal</option>
                        <option>Mensual</option>
                    </select>
                </td>
            </tr>
        </tbody>
    </table>
</div>
@endsection

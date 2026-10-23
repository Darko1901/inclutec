<?php

use App\Http\Controllers\CatalogoController;
use App\Http\Controllers\ComponentesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ElementoCatalogoController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\HabilidadController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\SesionController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\VacanteController;
use App\Support\Catalogos;
use Illuminate\Support\Facades\Route;

Route::get('/', [SesionController::class, 'inicio'])->name('inicio');
Route::get('/login', [SesionController::class, 'formulario'])->name('login');
Route::post('/login', [SesionController::class, 'entrar'])->name('login.entrar');
Route::post('/logout', [SesionController::class, 'salir'])->name('logout');

Route::middleware('admin')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/exportar', [DashboardController::class, 'exportar'])->name('dashboard.exportar');
    Route::get('/usuarios', [UsuarioController::class, 'index'])->name('usuarios');
    Route::get('/usuarios/nuevo', [UsuarioController::class, 'create'])->name('usuarios.crear');
    Route::post('/usuarios', [UsuarioController::class, 'store'])->name('usuarios.guardar');
    Route::get('/usuarios/{id}', [UsuarioController::class, 'show'])->whereNumber('id')->name('usuarios.ver');
    Route::get('/usuarios/{id}/editar', [UsuarioController::class, 'edit'])->whereNumber('id')->name('usuarios.editar');
    Route::put('/usuarios/{id}', [UsuarioController::class, 'update'])->whereNumber('id')->name('usuarios.actualizar');
    Route::patch('/usuarios/{id}/estado', [UsuarioController::class, 'estado'])->whereNumber('id')->name('usuarios.estado');
    Route::get('/empresas', [EmpresaController::class, 'index'])->name('empresas');
    Route::get('/empresas/nueva', [EmpresaController::class, 'create'])->name('empresas.crear');
    Route::post('/empresas', [EmpresaController::class, 'store'])->name('empresas.guardar');
    Route::get('/empresas/{id}', [EmpresaController::class, 'show'])->whereNumber('id')->name('empresas.ver');
    Route::get('/empresas/{id}/editar', [EmpresaController::class, 'edit'])->whereNumber('id')->name('empresas.editar');
    Route::put('/empresas/{id}', [EmpresaController::class, 'update'])->whereNumber('id')->name('empresas.actualizar');
    Route::get('/empresas/{id}/constancia', [EmpresaController::class, 'constancia'])->whereNumber('id')->name('empresas.constancia');
    Route::patch('/empresas/{id}/validacion', [EmpresaController::class, 'validacion'])->whereNumber('id')->name('empresas.validacion');
    Route::patch('/empresas/{id}/estado', [EmpresaController::class, 'estado'])->whereNumber('id')->name('empresas.estado');
    Route::get('/vacantes', [VacanteController::class, 'index'])->name('vacantes');
    Route::get('/vacantes/{id}', [VacanteController::class, 'show'])->whereNumber('id')->name('vacantes.ver');
    Route::patch('/vacantes/{id}/estado', [VacanteController::class, 'estado'])->whereNumber('id')->name('vacantes.estado');
    Route::get('/habilidades', [HabilidadController::class, 'index'])->name('habilidades');
    Route::get('/catalogos', [CatalogoController::class, 'index'])->name('catalogos');

    // Alta, edición, activar o desactivar y eliminar de los registros de WEB-06 y WEB-07 (diez catálogos).
    Route::prefix('/catalogo/{clave}')->where(['clave' => implode('|', Catalogos::claves()), 'id' => '[0-9]+'])->group(function () {
        Route::post('/', [ElementoCatalogoController::class, 'store'])->name('catalogo.guardar');
        Route::put('/{id}', [ElementoCatalogoController::class, 'update'])->name('catalogo.actualizar');
        Route::patch('/{id}/activo', [ElementoCatalogoController::class, 'activar'])->name('catalogo.activar');
        Route::delete('/{id}', [ElementoCatalogoController::class, 'destroy'])->name('catalogo.eliminar');
    });
    Route::get('/reportes', [ReporteController::class, 'index'])->name('reportes');
    Route::get('/reportes/{id}', [ReporteController::class, 'show'])->whereNumber('id')->name('reportes.ver');
    Route::patch('/reportes/{id}', [ReporteController::class, 'seguimiento'])->whereNumber('id')->name('reportes.seguimiento');
    Route::patch('/reportes/{id}/suspension', [ReporteController::class, 'suspension'])->whereNumber('id')->name('reportes.suspension');
    Route::get('/perfil', [PerfilController::class, 'index'])->name('perfil');
    Route::put('/perfil', [PerfilController::class, 'actualizar'])->name('perfil.actualizar');

    // Guía de componentes: solo existe con APP_ENV=local (el controlador responde 404 en otro entorno).
    Route::get('/componentes', [ComponentesController::class, 'index'])->name('componentes');
});

<?php

use App\Http\Controllers\CatalogoController;
use App\Http\Controllers\ComponentesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\HabilidadController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\SesionController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\VacanteController;
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
    Route::get('/vacantes', [VacanteController::class, 'index'])->name('vacantes');
    Route::get('/habilidades', [HabilidadController::class, 'index'])->name('habilidades');
    Route::get('/catalogos', [CatalogoController::class, 'index'])->name('catalogos');
    Route::get('/reportes', [ReporteController::class, 'index'])->name('reportes');
    Route::get('/perfil', [PerfilController::class, 'index'])->name('perfil');
    Route::put('/perfil', [PerfilController::class, 'actualizar'])->name('perfil.actualizar');

    // Guía de componentes: solo existe con APP_ENV=local (el controlador responde 404 en otro entorno).
    Route::get('/componentes', [ComponentesController::class, 'index'])->name('componentes');
});

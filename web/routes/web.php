<?php
use Illuminate\Support\Facades\Route;

Route::get('/', function () { return view('auth.WEB01_Login'); });
Route::get('/recuperar', function () { return view('auth.WEB01B_Recuperar'); });
Route::get('/dashboard', function () { return view('admin.WEB02_Dashboard'); });
Route::get('/usuarios', function () { return view('admin.WEB03_Usuarios'); });
Route::get('/empresas', function () { return view('admin.WEB04_Empresas'); });
Route::get('/vacantes', function () { return view('admin.WEB05_Vacantes'); });
Route::get('/habilidades', function () { return view('admin.WEB06_Habilidades'); });
Route::get('/catalogos', function () { return view('admin.WEB07_Catalogos'); });
Route::get('/reportes', function () { return view('admin.WEB08_Reportes'); });

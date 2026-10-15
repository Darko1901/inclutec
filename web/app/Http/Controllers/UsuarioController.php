<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class UsuarioController extends Controller
{
    public function index(): View
    {
        return view('admin.WEB03_Usuarios');
    }
}

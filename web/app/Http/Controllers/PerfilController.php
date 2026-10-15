<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class PerfilController extends Controller
{
    public function index(): View
    {
        return view('admin.WEB09_Perfil');
    }
}

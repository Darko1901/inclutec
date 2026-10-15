<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class EmpresaController extends Controller
{
    public function index(): View
    {
        return view('admin.WEB04_Empresas');
    }
}

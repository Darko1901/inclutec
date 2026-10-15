<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class HabilidadController extends Controller
{
    public function index(): View
    {
        return view('admin.WEB06_Habilidades');
    }
}

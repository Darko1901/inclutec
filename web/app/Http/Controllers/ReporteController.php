<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class ReporteController extends Controller
{
    public function index(): View
    {
        return view('admin.WEB08_Reportes');
    }
}

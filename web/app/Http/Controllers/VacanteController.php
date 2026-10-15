<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class VacanteController extends Controller
{
    public function index(): View
    {
        return view('admin.WEB05_Vacantes');
    }
}

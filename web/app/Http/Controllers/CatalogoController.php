<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class CatalogoController extends Controller
{
    public function index(): View
    {
        return view('admin.WEB07_Catalogos');
    }
}

<?php
function removeBOM($filepath) {
    $content = file_get_contents($filepath);
    if (substr($content, 0, 3) == "\xEF\xBB\xBF") {
        $content = substr($content, 3);
        file_put_contents($filepath, $content);
        echo "Removed BOM from $filepath\n";
    }
}

$dir = new RecursiveDirectoryIterator('.');
$iter = new RecursiveIteratorIterator($dir);
$regex = new RegexIterator($iter, '/^.+\.(php|css)$/i', RecursiveRegexIterator::GET_MATCH);

foreach ($regex as $file) {
    removeBOM($file[0]);
}
echo "Done.\n";
?>

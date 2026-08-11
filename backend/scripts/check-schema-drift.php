<?php

$root = dirname(__DIR__);
$path = dirname(__DIR__, 2).'/frontend/src/validation/generated/schemas.ts';
$before = file_exists($path) ? file_get_contents($path) : null;

$command = escapeshellarg(PHP_BINARY).' '.escapeshellarg($root.'/artisan').' schema:generate';
passthru($command, $status);

if ($status !== 0) {
    exit($status);
}

require $root.'/scripts/add-schema-header.php';
$after = file_get_contents($path);

if ($before !== null) {
    file_put_contents($path, $before);
} else {
    unlink($path);
}

if ($before !== $after) {
    fwrite(STDERR, "Generated validation schemas are out of date. Run `composer schemas:generate`.\n");
    exit(1);
}

fwrite(STDOUT, "Generated validation schemas are up to date.\n");

<?php

$path = dirname(__DIR__, 2).'/frontend/src/validation/generated/schemas.ts';
$header = "// AUTO-GENERATED FILE.\n// DO NOT EDIT MANUALLY. Run `composer schemas:generate` in backend/.\n\n";

if (! file_exists($path)) {
    fwrite(STDERR, "Generated schema file was not found.\n");
    exit(1);
}

$contents = file_get_contents($path);

if (! str_starts_with($contents, '// AUTO-GENERATED FILE.')) {
    file_put_contents($path, $header.$contents);
}

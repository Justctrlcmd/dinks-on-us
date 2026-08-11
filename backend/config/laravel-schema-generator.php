<?php

use RomegaSoftware\LaravelSchemaGenerator\Writers\ZodTypeScriptWriter;

return [
    'scan_paths' => [app_path('Http/Requests')],
    'writer' => ZodTypeScriptWriter::class,
    'zod' => [
        'output' => [
            'path' => base_path('../frontend/src/validation/generated/schemas.ts'),
            'format' => 'module',
            'namespace' => 'Schemas',
            'separate_files' => false,
            'directory' => null,
        ],
    ],
    'app_types_import_path' => '.',
    'app_prefix' => 'App',
    'use_app_types' => false,
    'features' => [
        'data_classes' => false,
        'typescript_transformer_hook' => false,
    ],
    'custom_extractors' => [],
    'custom_type_handlers' => [],
];

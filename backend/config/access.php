<?php

return [
    'modules' => [
        'DASHBOARD' => [
            'name' => 'Dashboard',
            'description' => 'View operational summaries and dashboard activity.',
            'group' => null,
        ],
        'RESERVATION' => [
            'name' => 'Reservations',
            'description' => 'Review and manage active reservation workflows.',
            'group' => null,
        ],
        'HISTORY' => [
            'name' => 'History',
            'description' => 'Review finalized reservation records.',
            'group' => null,
        ],
        'MANAGEMENT_COURT_PRICING' => [
            'name' => 'Courts & Pricing',
            'description' => 'Manage courts, rates, operating hours, and rental equipment.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_AVAILABILITY_CLOSURES' => [
            'name' => 'Availability & Closures',
            'description' => 'Close business dates or selected court times.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_PAYMENT_METHODS' => [
            'name' => 'Payment Methods',
            'description' => 'Manage payment accounts and QR codes.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_TEAM_ACCESS' => [
            'name' => 'Team & Access',
            'description' => 'Manage Team accounts and reusable Access profiles.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_RULES_POLICIES' => [
            'name' => 'Rules & Policies',
            'description' => 'Manage customer-facing reservation policies.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_EVENTS' => [
            'name' => 'Events',
            'description' => 'Manage public events and announcements.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_GALLERY' => [
            'name' => 'Gallery',
            'description' => 'Manage public gallery tabs and images.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_FAQS' => [
            'name' => 'FAQs',
            'description' => 'Manage public frequently asked questions.',
            'group' => 'MANAGEMENT',
        ],
        'MANAGEMENT_STORAGE_RETENTION' => [
            'name' => 'Storage & Data Retention',
            'description' => 'Manually remove finalized payment-proof images without deleting business records.',
            'group' => 'MANAGEMENT',
        ],
        'ACTION_LOGS' => [
            'name' => 'Action Logs',
            'description' => 'Review completed operational and account-security actions.',
            'group' => null,
        ],
        'REPORTS' => [
            'name' => 'Reports',
            'description' => 'View reports, exports, and business analytics.',
            'group' => null,
        ],
    ],
];

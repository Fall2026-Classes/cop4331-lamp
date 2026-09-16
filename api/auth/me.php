<?php
//  GET    /api/auth/me - return user auth info

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method !== 'GET') {
    respond(405, ['error' => 'Method not allowed']);
}
    
respond(200, ['error' => 'TODO']);